import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppState } from '../persistence/AppStateContext';
import { CurriculumSubBlock, RecipeLessonContent } from '../types';
import { CodeBlock } from './CodeBlock';
import { MarkdownView } from './MarkdownView';
import { Panel, PanelHeader } from './Panel';

interface RecipeModeViewProps {
  subBlock: CurriculumSubBlock;
  recipe: RecipeLessonContent;
}

export function RecipeModeView({ subBlock, recipe }: RecipeModeViewProps) {
  const { state, toggleExerciseCompletion, saveSubBlockNotes } = useAppState();
  const [expandedMistakes, setExpandedMistakes] = useState(true);

  const subRecord = state.progress.subBlocks[subBlock.id];
  const isExerciseCompleted = Boolean(
    subRecord?.completedExerciseIds.includes(recipe.exercise.id)
  );
  const notes = subRecord?.draftNotes ?? '';

  return (
    <div className="space-y-6">
      {/* 1 & 2: Purpose & When to use it */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader title="1. Purpose" />
          <div className="p-5">
            <MarkdownView content={recipe.purposeMarkdown} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="2. When to Use It" />
          <div className="p-5">
            <MarkdownView content={recipe.whenToUseMarkdown} />
          </div>
        </Panel>
      </div>

      {/* 3: Setup and installation */}
      {recipe.setupCommands.length > 0 ? (
        <Panel>
          <PanelHeader
            title="3. Setup & Installation"
            subtitle="Copyable terminal commands"
          />
          <div className="p-5 space-y-4">
            {recipe.setupCommands.map((cmd) => (
              <div key={cmd.id} className="space-y-1.5">
                <CodeBlock
                  code={cmd.command}
                  title={cmd.label}
                  isCommand
                />
                {cmd.notes ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {cmd.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* 4: Core APIs */}
      <Panel>
        <PanelHeader title="4. Core APIs" />
        <div className="p-5">
          <MarkdownView content={recipe.coreApisMarkdown} />
        </div>
      </Panel>

      {/* 5: Standard Workflow */}
      <Panel>
        <PanelHeader
          title="5. Standard Workflow"
          subtitle="Step-by-step production implementation sequence"
        />
        <ol className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {recipe.workflowSteps.map((step) => (
            <li key={step.stepNumber} className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Step {step.stepNumber}. {step.title}
              </h3>
              <MarkdownView content={step.detailMarkdown} />
              {step.code ? (
                <CodeBlock
                  code={step.code.code}
                  title={step.code.title}
                  language={step.code.language}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </Panel>

      {/* 6: Working Examples */}
      {recipe.workingExamples.length > 0 ? (
        <Panel>
          <PanelHeader
            title="6. Working Examples"
            subtitle="Copyable reference implementations"
          />
          <div className="p-5 space-y-5">
            {recipe.workingExamples.map((ex) => (
              <div key={ex.id} className="space-y-2">
                <CodeBlock
                  code={ex.code}
                  title={ex.title}
                  language={ex.language}
                />
                {ex.explanation ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {ex.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* 7: Common Mistakes */}
      <Panel>
        <button
          type="button"
          onClick={() => setExpandedMistakes((prev) => !prev)}
          aria-expanded={expandedMistakes}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-[#161C26]/70 transition-colors cursor-pointer"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            7. Common Mistakes ({recipe.commonMistakes.length})
          </span>
          {expandedMistakes ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedMistakes ? (
          <ul className="border-t border-slate-200 dark:border-slate-800/80 divide-y divide-slate-200 dark:divide-slate-800/80">
            {recipe.commonMistakes.map((item, idx) => (
              <li key={idx} className="p-5 space-y-1.5 text-sm">
                <p className="font-medium text-red-700 dark:text-red-400">
                  Mistake: {item.mistake}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Fix: {item.fix}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {/* 8: Practical Exercise */}
      <Panel>
        <PanelHeader
          title={`8. Practical Exercise: ${recipe.exercise.title}`}
          subtitle="Complete the implementation task and verify all criteria before marking complete"
          action={
            <button
              type="button"
              onClick={() =>
                toggleExerciseCompletion(
                  subBlock.id,
                  recipe.exercise.id,
                  'recipe',
                  !isExerciseCompleted
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
            >
              {isExerciseCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Exercise Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 text-slate-400" />
                  <span>Mark Exercise Complete</span>
                </>
              )}
            </button>
          }
        />

        <div className="p-5 space-y-5">
          <MarkdownView content={recipe.exercise.instructionsMarkdown} />

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Acceptance Criteria
            </h4>
            <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {recipe.exercise.acceptanceChecklist.map((criterion, idx) => (
                <li key={idx}>{criterion}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`recipe-notes-${subBlock.id}`}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Implementation Scratchpad (saved locally)
            </label>
            <textarea
              id={`recipe-notes-${subBlock.id}`}
              value={notes}
              onChange={(e) => saveSubBlockNotes(subBlock.id, e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder="Draft your TypeScript / SQL solution or verification notes here..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] px-3.5 py-3 text-sm font-mono leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}
