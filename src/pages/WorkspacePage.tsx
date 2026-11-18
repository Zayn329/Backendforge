import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Flag,
  Layers,
  SkipForward,
} from 'lucide-react';
import {
  EmptyState,
  FptEngineView,
  Panel,
  PanelHeader,
  RecipeModeView,
  StudyTimerWidget,
  SyntaxModeView,
} from '../components';
import { getSubBlockLessonContent } from '../content';
import { AUTHORITATIVE_SYLLABUS, findSubBlockById } from '../curriculum';
import { getMethodologyDefinition } from '../learning';
import { useAppState } from '../persistence/AppStateContext';
import { LearningMethodology } from '../types';
import { cn } from '../utilities';

export function WorkspacePage() {
  const {
    state,
    navigateTo,
    selectSubBlock,
    setActiveMethodology,
    skipSubBlock,
    toggleManualRevisionFlag,
    saveSubBlockNotes,
  } = useAppState();

  const [confirmSkipUnit, setConfirmSkipUnit] = useState(false);

  const selection = useMemo(
    () =>
      findSubBlockById(
        state.progress.currentSubBlockId,
        AUTHORITATIVE_SYLLABUS
      ),
    [state.progress.currentSubBlockId]
  );

  if (!selection) {
    return (
      <Panel>
        <EmptyState
          icon={BookOpen}
          title="No learning unit selected"
          description="Choose any sub-block from the 17-block Backend Forge curriculum, or start right at 0.1 Type System Fundamentals."
          actionLabel="Start 0.1 — Type System Fundamentals"
          onAction={() => selectSubBlock('0.1', 'fpt')}
        />
      </Panel>
    );
  }

  const { block, subBlock } = selection;
  const lessonContent = getSubBlockLessonContent(subBlock.id);
  const subRecord = state.progress.subBlocks[subBlock.id];
  const status = subRecord?.status ?? 'not_started';
  const isFlaggedRevision = Boolean(subRecord?.needsRevision);

  // Ensure active methodology matches one of the sub-block's assigned modes
  const activeMode: LearningMethodology = subBlock.requiredModes.includes(
    state.progress.currentMethodology
  )
    ? state.progress.currentMethodology
    : subBlock.requiredModes[0] ?? 'fpt';

  const handleConfirmSkipUnit = () => {
    setConfirmSkipUnit(false);
    skipSubBlock(subBlock.id);
  };

  const handleSkipUnitClick = () => {
    if (state.settings.confirmBeforeSkipTopic) {
      setConfirmSkipUnit(true);
    } else {
      skipSubBlock(subBlock.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Block Header + Mode Switcher + Skip Topic */}
      <Panel className="p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Block {block.order} — {block.title}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                Mode: {subBlock.learningMode}
              </span>
              <span aria-hidden="true">·</span>
              <span>Status: {status.replace('_', ' ')}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {subBlock.id} — {subBlock.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {subBlock.requiredModes.length > 1 ? (
              <div
                role="tablist"
                aria-label="Sub-block learning modes"
                className="inline-flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0B0E14]"
              >
                {subBlock.requiredModes.map((mode) => {
                  const def = getMethodologyDefinition(mode);
                  const isActive = mode === activeMode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveMethodology(mode)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer',
                        isActive
                          ? 'bg-white dark:bg-[#18202F] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                      )}
                    >
                      {def.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() =>
                toggleManualRevisionFlag(
                  subBlock.id,
                  !isFlaggedRevision,
                  'Manually flagged for revision'
                )
              }
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap',
                isFlaggedRevision
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26]'
              )}
            >
              <Flag className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {isFlaggedRevision ? 'Flagged for Revision' : 'Flag Revision'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSkipUnitClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer whitespace-nowrap"
            >
              <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Skip Topic</span>
            </button>
          </div>
        </div>

        {/* Inline Skip Topic Confirmation */}
        {confirmSkipUnit ? (
          <div
            role="alertdialog"
            aria-label="Confirm skipping learning unit"
            className="p-4 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Skip {subBlock.id} — {subBlock.title}?
                </p>
                <p className="mt-0.5 opacity-90">
                  Your existing attempts stay preserved, and this unit will not
                  count as completed or mastered. You can revisit it anytime.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmSkipUnit}
                className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
              >
                Confirm Skip
              </button>
              <button
                type="button"
                onClick={() => setConfirmSkipUnit(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-amber-400/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* Study Timer + Syllabus Objectives Summary */}
        <StudyTimerWidget subBlockId={subBlock.id} />

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Syllabus Topics & Objectives ({subBlock.topics.length})
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
            {subBlock.topics.map((topic) => (
              <li
                key={topic.id}
                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
              >
                <CheckCircle2
                  className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {topic.group ? `${topic.group}: ` : ''}
                  {topic.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {/* Active Mode Content Area */}
      {activeMode === 'fpt' && lessonContent?.fpt ? (
        <FptEngineView
          block={block}
          subBlock={subBlock}
          lesson={lessonContent.fpt}
        />
      ) : activeMode === 'recipe' && lessonContent?.recipe ? (
        <RecipeModeView
          subBlock={subBlock}
          recipe={lessonContent.recipe}
        />
      ) : activeMode === 'syntax' && lessonContent?.syntax ? (
        <SyntaxModeView
          subBlock={subBlock}
          syntax={lessonContent.syntax}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel className="lg:col-span-7">
            <PanelHeader
              title="Unit Overview"
              subtitle={`Assigned methodology: ${subBlock.learningMode}`}
            />
            <EmptyState
              icon={Layers}
              title={`Lesson content for Block ${block.order} (${subBlock.id}) is unavailable`}
              description="All 17 curriculum blocks (0–16) should resolve from the modular lesson registry. Switch learning modes above or return to the curriculum browser."
              actionLabel="Back to Curriculum"
              onAction={() => navigateTo('curriculum')}
            />
          </Panel>

          <Panel className="lg:col-span-5">
            <PanelHeader
              title="Personal Study Notes"
              subtitle="Saved locally for this sub-block"
            />
            <div className="p-5">
              <textarea
                value={subRecord?.draftNotes ?? ''}
                onChange={(e) => saveSubBlockNotes(subBlock.id, e.target.value)}
                rows={10}
                placeholder={`Capture notes for ${subBlock.id} ${subBlock.title}...`}
                aria-label="Personal study notes"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] px-3.5 py-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
