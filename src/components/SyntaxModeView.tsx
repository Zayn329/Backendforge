import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Search } from 'lucide-react';
import { useAppState } from '../persistence/AppStateContext';
import { CurriculumSubBlock, SyntaxLessonContent } from '../types';
import { CodeBlock } from './CodeBlock';
import { MarkdownView } from './MarkdownView';
import { Panel, PanelHeader } from './Panel';

interface SyntaxModeViewProps {
  subBlock: CurriculumSubBlock;
  syntax: SyntaxLessonContent;
}

export function SyntaxModeView({ subBlock, syntax }: SyntaxModeViewProps) {
  const { state, toggleExerciseCompletion, saveSubBlockNotes } = useAppState();
  const [filterQuery, setFilterQuery] = useState('');

  const subRecord = state.progress.subBlocks[subBlock.id];
  const isExerciseCompleted = Boolean(
    subRecord?.completedExerciseIds.includes(syntax.quickExercise.id)
  );
  const notes = subRecord?.draftNotes ?? '';

  const normalizedQuery = filterQuery.trim().toLowerCase();

  const filteredCommands = useMemo(
    () =>
      !normalizedQuery
        ? syntax.commonCommands
        : syntax.commonCommands.filter(
            (c) =>
              c.label.toLowerCase().includes(normalizedQuery) ||
              c.command.toLowerCase().includes(normalizedQuery)
          ),
    [syntax.commonCommands, normalizedQuery]
  );

  const filteredParameters = useMemo(
    () =>
      !normalizedQuery
        ? syntax.importantParameters
        : syntax.importantParameters.filter(
            (p) =>
              p.name.toLowerCase().includes(normalizedQuery) ||
              p.description.toLowerCase().includes(normalizedQuery)
          ),
    [syntax.importantParameters, normalizedQuery]
  );

  const filteredExamples = useMemo(
    () =>
      !normalizedQuery
        ? syntax.examples
        : syntax.examples.filter(
            (ex) =>
              ex.title.toLowerCase().includes(normalizedQuery) ||
              ex.code.toLowerCase().includes(normalizedQuery)
          ),
    [syntax.examples, normalizedQuery]
  );

  return (
    <div className="space-y-6">
      {/* Search Reference Bar */}
      <Panel className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Search commands, parameters, or syntax examples
        </span>
        <div className="relative sm:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter syntax reference..."
            aria-label="Filter syntax reference"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Panel>

      {/* 1: Syntax Reference */}
      <Panel>
        <PanelHeader title="1. Syntax Reference" />
        <div className="p-5">
          <MarkdownView content={syntax.referenceMarkdown} />
        </div>
      </Panel>

      {/* 2: Common Commands */}
      <Panel>
        <PanelHeader
          title="2. Common Commands"
          subtitle="Copyable CLI commands"
        />
        <div className="p-5 space-y-3">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd) => (
              <CodeBlock
                key={cmd.id}
                code={cmd.command}
                title={cmd.label}
                isCommand
              />
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No commands match "{filterQuery}".
            </p>
          )}
        </div>
      </Panel>

      {/* 3: Important Parameters */}
      <Panel>
        <PanelHeader title="3. Important Parameters" />
        {filteredParameters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E131B]">
                  <th className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    Parameter
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    Type / Values
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    Behavior
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredParameters.map((param) => (
                  <tr key={param.name}>
                    <td className="px-5 py-3 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {param.name}
                    </td>
                    <td className="px-5 py-3 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {param.type}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {param.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-xs text-slate-500 dark:text-slate-400">
            No parameters match "{filterQuery}".
          </div>
        )}
      </Panel>

      {/* 4: Configuration */}
      <Panel>
        <PanelHeader title="4. Configuration" />
        <div className="p-5">
          <MarkdownView content={syntax.configurationMarkdown} />
        </div>
      </Panel>

      {/* 5: Examples */}
      <Panel>
        <PanelHeader title="5. Examples" />
        <div className="p-5 space-y-4">
          {filteredExamples.length > 0 ? (
            filteredExamples.map((ex) => (
              <CodeBlock
                key={ex.id}
                code={ex.code}
                title={ex.title}
                language={ex.language}
              />
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No examples match "{filterQuery}".
            </p>
          )}
        </div>
      </Panel>

      {/* 6: Common Mistakes */}
      <Panel>
        <PanelHeader title="6. Common Mistakes" />
        <ul className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {syntax.commonMistakes.map((item, idx) => (
            <li key={idx} className="p-5 space-y-1 text-sm">
              <p className="font-medium text-red-700 dark:text-red-400">
                Mistake: {item.mistake}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Fix: {item.fix}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      {/* 7: Quick Exercise */}
      <Panel>
        <PanelHeader
          title={`7. Quick Exercise: ${syntax.quickExercise.title}`}
          action={
            <button
              type="button"
              onClick={() =>
                toggleExerciseCompletion(
                  subBlock.id,
                  syntax.quickExercise.id,
                  'syntax',
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

        <div className="p-5 space-y-4">
          <MarkdownView content={syntax.quickExercise.promptMarkdown} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Expected outcome: {syntax.quickExercise.expectedOutcome}
          </p>
          <textarea
            value={notes}
            onChange={(e) => saveSubBlockNotes(subBlock.id, e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder="Write your config or syntax snippet here..."
            aria-label="Syntax exercise scratchpad"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] px-3.5 py-3 text-sm font-mono leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      </Panel>
    </div>
  );
}
