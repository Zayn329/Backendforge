import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  HelpCircle,
  Layers,
  Loader2,
  MessageSquare,
  Send,
  SkipForward,
} from 'lucide-react';
import {
  DEFAULT_FPT_RUBRIC,
  evaluateFptAnswerWithGroq,
  getEvaluationReadiness,
} from '../evaluation';
import { useAppState } from '../persistence/AppStateContext';
import { classifyScoreThreshold } from '../progress';
import {
  CurriculumBlock,
  CurriculumSubBlock,
  EvaluationHistoryRecord,
  FptLessonContent,
  FptTopicSection,
} from '../types';
import { cn, formatRelativeTimestamp } from '../utilities';
import { CodeBlock } from './CodeBlock';
import { MarkdownView } from './MarkdownView';
import { Panel, PanelHeader } from './Panel';

interface FptEngineViewProps {
  block: CurriculumBlock;
  subBlock: CurriculumSubBlock;
  lesson: FptLessonContent;
}

function buildLessonContextForEvaluation(lesson: FptLessonContent): string {
  if (lesson.mode === 'theory_first' && lesson.topicSections?.length) {
    const parts: string[] = [];
    if (lesson.introduction) {
      parts.push(
        `Introduction:\n${lesson.introduction.summaryMarkdown}\n${lesson.introduction.whyItMattersMarkdown}`
      );
    }
    for (const topic of lesson.topicSections) {
      parts.push(
        [
          `Topic ${topic.topicId} — ${topic.title}:`,
          topic.problemAndRequirementsMarkdown,
          topic.conceptAndMechanismMarkdown,
          topic.backendApplicationsMarkdown,
          topic.edgeCasesAndTradeOffsMarkdown,
          `Central Idea: ${topic.centralIdeaSummary}`,
        ].join('\n\n')
      );
    }
    if (lesson.conceptConnection) {
      parts.push(
        [
          `Concept Connection — ${lesson.conceptConnection.title}:`,
          lesson.conceptConnection.narrativeMarkdown,
          lesson.conceptConnection.walkthroughMarkdown,
        ].join('\n\n')
      );
    }
    return parts.join('\n\n---\n\n');
  }

  return [lesson.overviewMarkdown ?? '', lesson.mentalModelMarkdown ?? '']
    .filter(Boolean)
    .join('\n\n');
}

function scrollToSectionElement(elementId: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(elementId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function FptEngineView({ block, subBlock, lesson }: FptEngineViewProps) {
  const {
    state,
    navigateTo,
    setFptPosition,
    saveFptDraft,
    recordFptSubmission,
    viewFptHint,
    revealFptExplanation,
    skipFptQuestion,
  } = useAppState();

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const subRecord = state.progress.subBlocks[subBlock.id];
  const session = subRecord?.fptSession;
  const questions = lesson.questions;

  const isTheoryFirst =
    lesson.mode === 'theory_first' &&
    Boolean(lesson.introduction) &&
    Boolean(lesson.topicSections?.length);

  const safeIndex = Math.min(
    Math.max(0, session?.currentQuestionIndex ?? 0),
    Math.max(0, questions.length - 1)
  );
  const activeQuestion = questions[safeIndex];

  const currentAnswerText = activeQuestion
    ? session?.draftAnswers[activeQuestion.id] ??
      session?.submittedAnswers[activeQuestion.id] ??
      ''
    : '';

  const hintsViewedCount = activeQuestion
    ? session?.viewedHints[activeQuestion.id] ?? 0
    : 0;
  const isExplanationRevealed = activeQuestion
    ? Boolean(session?.revealedExplanations.includes(activeQuestion.id))
    : false;
  const isSubmitted = activeQuestion
    ? Boolean(session?.submittedAnswers[activeQuestion.id])
    : false;
  const isSkipped = activeQuestion
    ? Boolean(session?.skippedQuestionIds.includes(activeQuestion.id))
    : false;

  const questionEvaluations = useMemo<EvaluationHistoryRecord[]>(() => {
    if (!activeQuestion) return [];
    return state.progress.evaluations.filter(
      (ev) =>
        ev.subBlockId === subBlock.id && ev.questionId === activeQuestion.id
    );
  }, [state.progress.evaluations, subBlock.id, activeQuestion]);

  const latestEvaluation = questionEvaluations[0] ?? null;

  const readiness = useMemo(
    () => getEvaluationReadiness(state.settings.groqApiKey),
    [state.settings.groqApiKey]
  );

  const lessonContext = useMemo(
    () => buildLessonContextForEvaluation(lesson),
    [lesson]
  );

  const topicMap = useMemo(() => {
    const map = new Map<string, FptTopicSection>();
    for (const sec of lesson.topicSections ?? []) {
      map.set(sec.topicId, sec);
      for (const extraId of sec.coveredTopicIds ?? []) {
        map.set(extraId, sec);
      }
    }
    return map;
  }, [lesson.topicSections]);

  const answeredCount = questions.filter((q) =>
    Boolean(session?.submittedAnswers[q.id])
  ).length;
  const skippedCount = questions.filter((q) =>
    Boolean(session?.skippedQuestionIds.includes(q.id))
  ).length;

  const handleSelectQuestion = (idx: number) => {
    const target = questions[idx];
    if (!target) return;
    setEvalError(null);
    setLocalNotice(null);
    setFptPosition(subBlock.id, idx);
  };

  const handleRequestHint = () => {
    if (!activeQuestion || hintsViewedCount >= 3) return;
    viewFptHint(subBlock.id, activeQuestion.id, hintsViewedCount + 1);
  };

  const handleRevealExplanation = () => {
    if (!activeQuestion) return;
    revealFptExplanation(subBlock.id, activeQuestion.id);
  };

  const handleSkipQuestion = () => {
    if (!activeQuestion) return;
    const nextIdx =
      safeIndex + 1 < questions.length ? safeIndex + 1 : safeIndex;
    setEvalError(null);
    setLocalNotice('Question marked as skipped. Your unit remains active.');
    skipFptQuestion(subBlock.id, activeQuestion.id, nextIdx);
  };

  const handleSubmitAnswer = async () => {
    if (!activeQuestion) return;
    const trimmed = currentAnswerText.trim();
    if (!trimmed) {
      setEvalError('Write your reasoning in the editor before submitting.');
      return;
    }

    setEvalError(null);
    setLocalNotice(null);

    const questionFocus =
      activeQuestion.focusArea ?? `Question ${safeIndex + 1}`;

    if (!readiness.canEvaluate) {
      recordFptSubmission({
        subBlockId: subBlock.id,
        questionId: activeQuestion.id,
        questionLabel: `Question ${safeIndex + 1}`,
        questionFocus,
        answer: trimmed,
      });
      setLocalNotice(
        'Answer saved locally. Configure a Groq API key in Settings when you want AI learning feedback.'
      );
      return;
    }

    setIsEvaluating(true);
    const rubric = lesson.customRubric ?? [...DEFAULT_FPT_RUBRIC];
    const outcome = await evaluateFptAnswerWithGroq(
      {
        blockTitle: `Block ${block.order} — ${block.title}`,
        subBlockId: subBlock.id,
        subBlockTitle: subBlock.title,
        objectives: subBlock.topics.map((t) => t.title),
        questionContext: questionFocus,
        questionId: activeQuestion.id,
        questionPrompt: activeQuestion.prompt,
        learnerAnswer: trimmed,
        lessonContext,
        questionExplanation: activeQuestion.explanation,
        evaluationCriteria: activeQuestion.evaluationCriteria,
        rubric,
      },
      state.settings.groqApiKey,
      state.settings.groqModel
    );
    setIsEvaluating(false);

    if (!outcome.ok) {
      setEvalError(outcome.error);
      return;
    }

    recordFptSubmission({
      subBlockId: subBlock.id,
      questionId: activeQuestion.id,
      questionLabel: `Question ${safeIndex + 1}`,
      questionFocus,
      answer: trimmed,
      evaluation: outcome.data,
      model: state.settings.groqModel,
    });
  };

  const hintLabels = [
    'Hint 1: Conceptual nudge',
    'Hint 2: Guided reasoning clue',
    'Hint 3: Core mechanism outline',
  ];

  return (
    <div className="space-y-8">
      {/* SECTION A — SUB-BLOCK INTRODUCTION */}
      {isTheoryFirst && lesson.introduction ? (
        <Panel id="fpt-section-intro">
          <PanelHeader
            title={`Section A · Introduction to ${subBlock.id} — ${subBlock.title}`}
            subtitle="Understand the problem space, backend relevance, and foundations before diving into the mechanics"
            action={
              <button
                type="button"
                onClick={() => scrollToSectionElement('fpt-section-check')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer"
              >
                <span>Jump to Knowledge Check</span>
              </button>
            }
          />

          <div className="p-5 sm:p-6 space-y-6">
            <div className="max-w-3xl space-y-5">
              <MarkdownView content={lesson.introduction.summaryMarkdown} />

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Why This Matters in Backend Engineering
                </h3>
                <MarkdownView
                  content={lesson.introduction.whyItMattersMarkdown}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              {/* Prerequisites from previously studied sub-blocks */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Prerequisites from Earlier Units
                </h3>
                <ul className="space-y-2.5">
                  {lesson.introduction.prerequisites.map((pre, idx) => (
                    <li
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] space-y-1"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {pre.label}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {pre.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Topics covered with direct study links */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Topics Covered in Section B
                </h3>
                <ul className="space-y-2.5">
                  {subBlock.topics.map((topic, idx) => {
                    const targetSec = topicMap.get(topic.id);
                    const scrollTargetId = targetSec
                      ? `fpt-topic-${targetSec.topicId}`
                      : `fpt-topic-${topic.id}`;
                    return (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() => scrollToSectionElement(scrollTargetId)}
                          className="w-full p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] hover:border-blue-500/50 hover:bg-slate-100/70 dark:hover:bg-[#161C26] transition-colors text-left flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                              Topic {idx + 1} · {topic.id}
                            </div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                              {topic.title}
                            </div>
                          </div>
                          <ArrowUpRight
                            className="w-4 h-4 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </Panel>
      ) : (
        /* Unmigrated units (0.1, 1.x, 2.x) — Expanded Theory Reference (No 9-Stage Grid) */
        <Panel>
          <PanelHeader
            title={`Section A & B · Study Material — ${subBlock.id} ${subBlock.title}`}
            subtitle="Read through the mental model and prerequisites carefully before answering the knowledge check"
          />
          <div className="p-5 sm:p-6 space-y-5 max-w-3xl">
            {lesson.prerequisites && lesson.prerequisites.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Prerequisites
                </h3>
                <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {lesson.prerequisites.map((pre, i) => (
                    <li key={i}>{pre}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lesson.overviewMarkdown ? (
              <MarkdownView content={lesson.overviewMarkdown} />
            ) : null}
            {lesson.mentalModelMarkdown ? (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <MarkdownView content={lesson.mentalModelMarkdown} />
              </div>
            ) : null}
          </div>
        </Panel>
      )}

      {/* SECTION B — COMPLETE TOPIC-BY-TOPIC STUDY MATERIAL (Pilot 0.2) */}
      {isTheoryFirst && lesson.topicSections ? (
        <section aria-label="Section B: Complete Study Material" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Section B · Complete Study Material
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every syllabus topic taught progressively from the underlying problem to mechanism, code, and trade-offs
              </p>
            </div>
          </div>

          {lesson.topicSections.map((topicSec, topicIdx) => (
            <Panel
              key={topicSec.id}
              id={`fpt-topic-${topicSec.topicId}`}
              className="scroll-mt-6"
            >
              <PanelHeader
                title={`Topic ${topicIdx + 1} (${topicSec.topicId}) · ${topicSec.title}`}
                subtitle="Problem → Requirement → Mechanism → Consequences"
                action={
                  <BookOpen
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                    aria-hidden="true"
                  />
                }
              />

              <div className="p-5 sm:p-6 space-y-6 max-w-4xl">
                {/* 1-3: Problem, Insufficiency, Derived Requirements */}
                <MarkdownView content={topicSec.problemAndRequirementsMarkdown} />

                {/* 4-6: Terminology, Progressive Mechanism, Simple Examples */}
                <div className="pt-5 border-t border-slate-200 dark:border-slate-800/80">
                  <MarkdownView content={topicSec.conceptAndMechanismMarkdown} />
                </div>

                {/* 7-8: Annotated Code Examples & Walkthroughs */}
                {topicSec.codeExamples.length > 0 ? (
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Putting It Into Code
                    </h4>
                    {topicSec.codeExamples.map((ex) => (
                      <div key={ex.snippet.id} className="space-y-3">
                        <CodeBlock
                          code={ex.snippet.code}
                          title={ex.snippet.title}
                          language={ex.snippet.language}
                        />
                        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] space-y-2">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Why This Works
                          </div>
                          <MarkdownView
                            content={ex.lineByLineMarkdown}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* 9: Practical Backend Applications */}
                {topicSec.backendApplicationsMarkdown ? (
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Where This Shows Up in Backends
                    </h4>
                    <MarkdownView
                      content={topicSec.backendApplicationsMarkdown}
                    />
                  </div>
                ) : null}

                {/* 10: Edge Cases, Limitations & Consequences */}
                {topicSec.edgeCasesAndTradeOffsMarkdown ? (
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Consequences & Limitations to Keep in Mind
                    </h4>
                    <MarkdownView
                      content={topicSec.edgeCasesAndTradeOffsMarkdown}
                    />
                  </div>
                ) : null}

                {/* 11: Concise Summary of Central Idea */}
                <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-600/5 dark:bg-blue-500/10 space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                    The Crux — {topicSec.topicId}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {topicSec.centralIdeaSummary}
                  </p>
                </div>
              </div>
            </Panel>
          ))}
        </section>
      ) : null}

      {/* SECTION C — CONNECT THE CONCEPTS (Pilot 0.2) */}
      {isTheoryFirst && lesson.conceptConnection ? (
        <Panel id="fpt-section-connect">
          <PanelHeader
            title={`Section C · Connect the Concepts — ${lesson.conceptConnection.title}`}
            subtitle="See how every topic in this unit works together inside a single backend service boundary"
            action={
              <Layers
                className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
            }
          />
          <div className="p-5 sm:p-6 space-y-5 max-w-4xl">
            <MarkdownView content={lesson.conceptConnection.narrativeMarkdown} />

            <CodeBlock
              code={lesson.conceptConnection.integratedExample.code}
              title={lesson.conceptConnection.integratedExample.title}
              language={lesson.conceptConnection.integratedExample.language}
            />

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                End-to-End Walkthrough
              </h4>
              <MarkdownView
                content={lesson.conceptConnection.walkthroughMarkdown}
                className="text-sm"
              />
            </div>
          </div>
        </Panel>
      ) : null}

      {/* SECTION D — KNOWLEDGE CHECK */}
      {activeQuestion ? (
        <section
          id="fpt-section-check"
          aria-label="Section D: Knowledge Check"
          className="space-y-6 scroll-mt-6"
        >
          <Panel>
            <PanelHeader
              title="Section D · Knowledge Check"
              subtitle="Test your grasp of the problem, mechanism, edge cases, and practical design without relying on memorized wording"
              action={
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    {answeredCount} / {questions.length} answered
                  </span>
                  {skippedCount > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{skippedCount} skipped</span>
                    </>
                  ) : null}
                </div>
              }
            />

            {/* Navigable Question Selector List (No 9-Stage Grid) */}
            <div className="p-4 sm:px-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0D1119]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {questions.map((q, idx) => {
                  const submitted = Boolean(session?.submittedAnswers[q.id]);
                  const skipped = Boolean(
                    session?.skippedQuestionIds.includes(q.id)
                  );
                  const isCurrent = idx === safeIndex;
                  const focusLabel = q.focusArea ?? `Question ${idx + 1}`;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleSelectQuestion(idx)}
                      className={cn(
                        'px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer min-h-[44px]',
                        isCurrent
                          ? 'border-blue-500 bg-blue-600/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          : submitted
                            ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                            : skipped
                              ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11151D] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26]'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono tabular-nums opacity-80">
                          Question {idx + 1}
                        </div>
                        <div className="text-xs font-medium truncate">
                          {focusLabel}
                        </div>
                      </div>
                      {submitted ? (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-500 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-[11px] opacity-75 shrink-0">
                          {skipped ? 'Skipped' : isCurrent ? 'Active' : 'Pending'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Question + Reasoning Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800/80">
              {/* Left: Question Prompt, Theory Link, Progressive Hints, Reference Explanation */}
              <div className="lg:col-span-6 p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      Question {safeIndex + 1} of {questions.length}
                    </span>
                    {activeQuestion.focusArea ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeQuestion.focusArea}</span>
                      </>
                    ) : null}
                    {isSubmitted ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Submitted
                        </span>
                      </>
                    ) : isSkipped ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Skipped
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={safeIndex === 0}
                      onClick={() => handleSelectQuestion(safeIndex - 1)}
                      aria-label="Previous question"
                      className="p-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={safeIndex >= questions.length - 1}
                      onClick={() => handleSelectQuestion(safeIndex + 1)}
                      aria-label="Next question"
                      className="p-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <MarkdownView content={activeQuestion.prompt} />

                {/* Quick Jump Back to Relevant Section B Topic */}
                {isTheoryFirst && activeQuestion.topicIds.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Relevant reading:
                    </span>
                    {activeQuestion.topicIds.map((tid) => {
                      const sec = topicMap.get(tid);
                      const scrollTargetId = sec
                        ? `fpt-topic-${sec.topicId}`
                        : `fpt-topic-${tid}`;
                      return (
                        <button
                          key={tid}
                          type="button"
                          onClick={() => scrollToSectionElement(scrollTargetId)}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <span>
                            {tid}
                            {sec ? ` ${sec.title}` : ''}
                          </span>
                          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Progressive Hints + Reference Explanation */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                      Hints ({hintsViewedCount} / 3 viewed)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={hintsViewedCount >= 3}
                        onClick={handleRequestHint}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2634] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {hintsViewedCount >= 3
                            ? 'All Hints Shown'
                            : `Show Hint ${hintsViewedCount + 1}`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRevealExplanation}
                        disabled={isExplanationRevealed}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2634] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {isExplanationRevealed
                            ? 'Explanation Shown'
                            : 'Reveal Reference Answer'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {hintsViewedCount > 0 ? (
                    <div className="space-y-2">
                      {activeQuestion.hints
                        .slice(0, hintsViewedCount)
                        .map((hint, hIdx) => (
                          <div
                            key={hIdx}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] text-xs space-y-1"
                          >
                            <div className="font-semibold text-blue-600 dark:text-blue-400">
                              {hintLabels[hIdx]}
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {hint}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : null}

                  {isExplanationRevealed ? (
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] space-y-1.5">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Reference Explanation (study aid — submit your own explanation to check understanding)
                      </div>
                      <MarkdownView
                        content={activeQuestion.explanation}
                        className="text-xs"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right: Reasoning Editor */}
              <div className="lg:col-span-6 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Your Reasoning
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Explain the mechanism in your own words — understanding counts, not exact phrasing
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {currentAnswerText.length} chars
                  </span>
                </div>

                <textarea
                  value={currentAnswerText}
                  onChange={(e) =>
                    saveFptDraft(subBlock.id, activeQuestion.id, e.target.value)
                  }
                  rows={10}
                  placeholder="Walk through how the mechanism behaves, what fails if misused, or write the typed contract..."
                  aria-label="Knowledge check answer editor"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] px-3.5 py-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[220px]"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer min-h-[40px]"
                  >
                    <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Skip Question</span>
                  </button>

                  <button
                    type="button"
                    disabled={isEvaluating}
                    onClick={handleSubmitAnswer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition-colors cursor-pointer min-h-[40px]"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating with Groq...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {readiness.canEvaluate
                            ? 'Submit for Feedback'
                            : 'Save Answer Locally'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {evalError ? (
                  <div
                    role="alert"
                    className="p-3 rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/30 flex items-start justify-between gap-3 text-xs text-red-700 dark:text-red-300"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{evalError}</span>
                    </div>
                    {readiness.canEvaluate ? (
                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        className="px-2.5 py-1 rounded border border-red-400/50 font-medium hover:bg-red-100 dark:hover:bg-red-900/40 shrink-0 cursor-pointer"
                      >
                        Retry
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {localNotice ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {localNotice}
                  </p>
                ) : !readiness.canEvaluate ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Add a Groq API key in Settings to receive detailed Section E feedback.
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateTo('settings')}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Open Settings
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          {/* SECTION E — LEARNING FEEDBACK */}
          <Panel id="fpt-section-feedback">
            <PanelHeader
              title="Section E · Learning Feedback"
              subtitle={
                latestEvaluation
                  ? `Question ${safeIndex + 1} · ${latestEvaluation.model} · ${formatRelativeTimestamp(latestEvaluation.timestamp)}`
                  : `Question ${safeIndex + 1} · Submit your answer above to receive mechanism-level feedback`
              }
              action={
                latestEvaluation ? (
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {latestEvaluation.result.score} / 100
                  </span>
                ) : (
                  <MessageSquare
                    className="w-4 h-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                )
              }
            />

            {latestEvaluation ? (
              <div className="p-5 sm:p-6 space-y-5 text-sm">
                {/* Summary Verdict */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800/80">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {latestEvaluation.result.verdict}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {
                      classifyScoreThreshold(latestEvaluation.result.score)
                        .label
                    }
                    {' · '}Next step: {latestEvaluation.result.recommended_action}
                  </span>
                </div>

                {/* Strengths / Gaps / Misconceptions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] space-y-2">
                    <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                      What You Understood Correctly
                    </h4>
                    {latestEvaluation.result.strengths.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {latestEvaluation.result.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400">
                        Keep building up the core explanation using the guidance below.
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] space-y-2">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                      What Was Missing
                    </h4>
                    {latestEvaluation.result.gaps.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {latestEvaluation.result.gaps.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400">
                        No critical gaps identified for this question.
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] space-y-2">
                    <h4 className="font-semibold text-red-700 dark:text-red-400">
                      Incorrect Assumptions
                    </h4>
                    {latestEvaluation.result.misconceptions.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {latestEvaluation.result.misconceptions.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400">
                        No incorrect assumptions detected.
                      </p>
                    )}
                  </div>
                </div>

                {/* Detailed Explanation & How to Improve */}
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      Detailed Mechanism Feedback
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {latestEvaluation.result.feedback}
                    </p>
                  </div>

                  {latestEvaluation.result.suggested_improvement ? (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        How to Improve
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {latestEvaluation.result.suggested_improvement}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Targeted Follow-Up Question */}
                {latestEvaluation.result.follow_up_question ? (
                  <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-600/5 dark:bg-blue-500/10 space-y-1 text-xs">
                    <div className="font-semibold text-blue-700 dark:text-blue-400">
                      Targeted Follow-Up Question
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {latestEvaluation.result.follow_up_question}
                    </p>
                  </div>
                ) : null}

                {/* Revisit Relevant Theory Section(s) */}
                {isTheoryFirst && activeQuestion.topicIds.length > 0 ? (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                    <Compass
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Revisit relevant theory:
                    </span>
                    {activeQuestion.topicIds.map((tid) => {
                      const sec = topicMap.get(tid);
                      const scrollTargetId = sec
                        ? `fpt-topic-${sec.topicId}`
                        : `fpt-topic-${tid}`;
                      return (
                        <button
                          key={tid}
                          type="button"
                          onClick={() => scrollToSectionElement(scrollTargetId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
                        >
                          <span>
                            {tid}
                            {sec ? ` — ${sec.title}` : ''}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Rubric Breakdown & Previous Attempts */}
                <details className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                  <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                    View rubric criterion scores
                    {questionEvaluations.length > 1
                      ? ` (${questionEvaluations.length} attempts recorded)`
                      : ''}
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg">
                      {latestEvaluation.result.criterion_scores.map(
                        (c, idx) => (
                          <div key={idx} className="p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {c.criterion}
                              </span>
                              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                {c.score} / {c.weight}
                              </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">
                              {c.rationale}
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    {questionEvaluations.length > 1 ? (
                      <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                        Previous attempts on this question:{' '}
                        {questionEvaluations
                          .slice(1, 5)
                          .map((h) => `${h.result.score}/100`)
                          .join(' · ')}
                      </div>
                    ) : null}
                  </div>
                </details>
              </div>
            ) : (
              <div className="p-5 sm:p-6 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {readiness.canEvaluate
                  ? 'Once you submit an answer in Section D, your structured feedback—strengths, missing concepts, misconceptions, improvement steps, follow-up questions, and direct links back to the relevant Section B topic—will appear here.'
                  : 'Answers saved locally are preserved across sessions. Configure a Groq API key in Settings whenever you want automated conceptual evaluation and Section E feedback.'}
              </div>
            )}
          </Panel>
        </section>
      ) : (
        <Panel className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No knowledge check questions configured for this sub-block yet.
          </p>
        </Panel>
      )}
    </div>
  );
}
