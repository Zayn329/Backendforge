import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { EmptyState, Panel } from '../components';
import { hasLessonContent } from '../content';
import {
  ALL_LEARNING_MODE_ASSIGNMENTS,
  AUTHORITATIVE_SYLLABUS,
  filterCurriculumBlocks,
  getCurriculumCounts,
} from '../curriculum';
import { useAppState } from '../persistence/AppStateContext';
import { LearningModeAssignment, SubBlockProgressStatus } from '../types';
import { cn } from '../utilities';

const STATUS_DISPLAY: Record<
  SubBlockProgressStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: 'Not started',
    className: 'text-slate-500 dark:text-slate-400',
  },
  in_progress: {
    label: 'In progress',
    className: 'text-blue-600 dark:text-blue-400 font-medium',
  },
  completed: {
    label: 'Completed',
    className: 'text-emerald-600 dark:text-emerald-400 font-medium',
  },
  mastered: {
    label: 'Mastered',
    className: 'text-emerald-700 dark:text-emerald-300 font-semibold',
  },
  skipped: {
    label: 'Skipped',
    className: 'text-amber-600 dark:text-amber-400 font-medium',
  },
  needs_review: {
    label: 'Needs review',
    className: 'text-red-600 dark:text-red-400 font-medium',
  },
};

export function CurriculumPage() {
  const { state, navigateTo, selectSubBlock } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<LearningModeAssignment | 'ALL'>(
    'ALL'
  );
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    { 'block-0': true }
  );
  const [expandedSubBlocks, setExpandedSubBlocks] = useState<
    Record<string, boolean>
  >({});

  const counts = useMemo(
    () => getCurriculumCounts(AUTHORITATIVE_SYLLABUS),
    []
  );

  const filteredBlocks = useMemo(
    () =>
      filterCurriculumBlocks(
        AUTHORITATIVE_SYLLABUS.blocks,
        searchQuery,
        modeFilter
      ),
    [searchQuery, modeFilter]
  );

  const isFiltering = Boolean(searchQuery.trim()) || modeFilter !== 'ALL';

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: !(prev[blockId] ?? false),
    }));
  };

  const toggleSubBlock = (subBlockId: string) => {
    setExpandedSubBlocks((prev) => ({
      ...prev,
      [subBlockId]: !(prev[subBlockId] ?? false),
    }));
  };

  const expandAll = () => {
    const nextBlocks: Record<string, boolean> = {};
    const nextSubs: Record<string, boolean> = {};
    for (const block of AUTHORITATIVE_SYLLABUS.blocks) {
      nextBlocks[block.id] = true;
      for (const sub of block.subBlocks) {
        nextSubs[sub.id] = true;
      }
    }
    setExpandedBlocks(nextBlocks);
    setExpandedSubBlocks(nextSubs);
  };

  const collapseAll = () => {
    const nextBlocks: Record<string, boolean> = {};
    const nextSubs: Record<string, boolean> = {};
    for (const block of AUTHORITATIVE_SYLLABUS.blocks) {
      nextBlocks[block.id] = false;
      for (const sub of block.subBlocks) {
        nextSubs[sub.id] = false;
      }
    }
    setExpandedBlocks(nextBlocks);
    setExpandedSubBlocks(nextSubs);
  };

  const handleOpenSubBlock = (subBlockId: string) => {
    selectSubBlock(subBlockId);
    navigateTo('workspace');
  };

  return (
    <div className="space-y-6">
      {/* Explorer Header, Search & Mode Filter */}
      <Panel className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {AUTHORITATIVE_SYLLABUS.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Version {AUTHORITATIVE_SYLLABUS.version}{' '}
              <span aria-hidden="true">·</span> {counts.blocks} blocks{' '}
              <span aria-hidden="true">·</span> {counts.subBlocks} sub-blocks{' '}
              <span aria-hidden="true">·</span> {counts.topics} topics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors whitespace-nowrap cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors whitespace-nowrap cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks, sub-blocks (e.g. 5.3), or topics..."
              aria-label="Search curriculum"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:w-56">
            <label htmlFor="curriculum-mode-filter" className="sr-only">
              Filter by learning mode
            </label>
            <select
              id="curriculum-mode-filter"
              value={modeFilter}
              onChange={(e) =>
                setModeFilter(e.target.value as LearningModeAssignment | 'ALL')
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Learning Modes</option>
              {ALL_LEARNING_MODE_ASSIGNMENTS.map((mode) => (
                <option key={mode} value={mode}>
                  Mode: {mode}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Blocks -> Sub-Blocks -> Topics */}
      {filteredBlocks.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Search}
            title="No matching curriculum units"
            description="No blocks, sub-blocks, or topics matched your current search or learning-mode filter."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setModeFilter('ALL');
            }}
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {filteredBlocks.map((block) => {
            const isBlockOpen = isFiltering
              ? true
              : (expandedBlocks[block.id] ?? false);

            const blockCompleted = block.subBlocks.filter((sb) => {
              const st = state.progress.subBlocks[sb.id]?.status;
              return st === 'completed' || st === 'mastered';
            }).length;

            return (
              <Panel key={block.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleBlock(block.id)}
                  aria-expanded={isBlockOpen}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-[#161C26]/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {isBlockOpen ? (
                      <ChevronDown className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Block {block.order} — {block.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {block.subBlocks.length} sub-blocks{' '}
                        <span aria-hidden="true">·</span> {blockCompleted} /{' '}
                        {block.subBlocks.length} finished
                      </p>
                    </div>
                  </div>
                </button>

                {isBlockOpen ? (
                  <div className="border-t border-slate-200 dark:border-slate-800/80 divide-y divide-slate-200 dark:divide-slate-800/80">
                    {block.subBlocks.map((subBlock) => {
                      const isSubOpen = isFiltering
                        ? true
                        : (expandedSubBlocks[subBlock.id] ?? false);
                      const record = state.progress.subBlocks[subBlock.id];
                      const status: SubBlockProgressStatus =
                        record?.status ?? 'not_started';
                      const statusMeta = STATUS_DISPLAY[status];
                      const isActive =
                        state.progress.currentSubBlockId === subBlock.id;
                      const populated = hasLessonContent(subBlock.id);

                      return (
                        <div
                          key={subBlock.id}
                          className={cn(
                            isActive && 'bg-blue-600/[0.03] dark:bg-blue-500/[0.06]'
                          )}
                        >
                          <div className="px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-[#0D1119]/60">
                            <button
                              type="button"
                              onClick={() => toggleSubBlock(subBlock.id)}
                              aria-expanded={isSubOpen}
                              className="flex items-start gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                            >
                              {isSubOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2">
                                    {subBlock.id}
                                  </span>
                                  {subBlock.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                  <span>{subBlock.learningMode}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{subBlock.topics.length} topics</span>
                                  <span aria-hidden="true">·</span>
                                  <span className={statusMeta.className}>
                                    {statusMeta.label}
                                  </span>
                                  {populated ? (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-slate-600 dark:text-slate-300">
                                        Lesson ready
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenSubBlock(subBlock.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161C26] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors self-start sm:self-center shrink-0 cursor-pointer"
                            >
                              <span>Open Unit</span>
                              <ArrowRight
                                className="w-3 h-3"
                                aria-hidden="true"
                              />
                            </button>
                          </div>

                          {isSubOpen ? (
                            <ul className="px-10 sm:px-12 py-3 space-y-1.5 bg-white dark:bg-[#111620] border-t border-slate-200/70 dark:border-slate-800/60">
                              {subBlock.topics.map((topic, tIdx) => {
                                const prevGroup =
                                  tIdx > 0
                                    ? subBlock.topics[tIdx - 1]?.group
                                    : undefined;
                                const showGroupHeader =
                                  topic.group && topic.group !== prevGroup;
                                return (
                                  <React.Fragment key={topic.id}>
                                    {showGroupHeader ? (
                                      <li className="pt-2 first:pt-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {topic.group}:
                                      </li>
                                    ) : null}
                                    <li className="text-xs text-slate-600 dark:text-slate-400 flex items-baseline gap-2.5 leading-relaxed">
                                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                                        {topic.id}
                                      </span>
                                      <span>{topic.title}</span>
                                    </li>
                                  </React.Fragment>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
