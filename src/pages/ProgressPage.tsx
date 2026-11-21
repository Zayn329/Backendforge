import React, { useMemo } from 'react';
import { ArrowRight, Check, Clock, History, RotateCcw } from 'lucide-react';
import {
  ActivityHeatmap,
  EmptyState,
  Panel,
  PanelHeader,
} from '../components';
import { getSubBlockLessonContent } from '../content';
import { AUTHORITATIVE_SYLLABUS, findSubBlockById } from '../curriculum';
import { getMethodologyDefinition } from '../learning';
import { useAppState } from '../persistence/AppStateContext';
import {
  computeProgressMetrics,
  computeSubBlockCompletionDetail,
  getRecentActivity,
  getRevisionRecommendations,
  getScheduledUpcomingRevisions,
} from '../progress';
import { formatRelativeTimestamp } from '../utilities';

export function ProgressPage() {
  const { state, navigateTo, selectSubBlock, markUnitRevised } = useAppState();

  const metrics = useMemo(
    () => computeProgressMetrics(state.progress, AUTHORITATIVE_SYLLABUS),
    [state.progress]
  );

  const activityHistory = useMemo(
    () => getRecentActivity(state.progress, 30),
    [state.progress]
  );

  const revisionQueue = useMemo(
    () => getRevisionRecommendations(state.progress),
    [state.progress]
  );

  const upcomingRevisions = useMemo(
    () => getScheduledUpcomingRevisions(state.progress),
    [state.progress]
  );

  return (
    <div className="space-y-6">
      {/* Deterministic Progress Metrics (Completed & Mastered Distinct) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Panel className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Units
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {metrics.totalUnits}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Completed
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {metrics.completedUnits}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mastered (80+)
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {metrics.masteredUnits}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            In Progress
          </p>
          <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {metrics.inProgressUnits}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Skipped
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
            {metrics.skippedUnits}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Due for Revision
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400 tabular-nums">
            {metrics.revisionUnitsCount}
          </p>
        </Panel>
      </div>

      {/* Block-by-Block Matrix & Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-5">
          <PanelHeader
            title="Block Progression"
            subtitle="Unit completion and partial item progress per block"
          />
          <ul className="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-[380px] overflow-y-auto">
            {AUTHORITATIVE_SYLLABUS.blocks.map((block) => {
              const total = block.subBlocks.length;
              const finished = block.subBlocks.filter((sb) => {
                const st = state.progress.subBlocks[sb.id]?.status;
                return st === 'completed' || st === 'mastered';
              }).length;
              const pct =
                total > 0
                  ? Math.round(
                      block.subBlocks.reduce((acc, sb) => {
                        const lesson = getSubBlockLessonContent(sb.id);
                        const detail = computeSubBlockCompletionDetail({
                          subBlock: sb,
                          record: state.progress.subBlocks[sb.id],
                          totalFptQuestions:
                            lesson?.fpt?.questions.length ?? 0,
                          fptQuestionIds: lesson?.fpt?.questions.map(
                            (q) => q.id
                          ),
                          hasRecipeExercise: Boolean(lesson?.recipe?.exercise),
                          hasSyntaxExercise: Boolean(
                            lesson?.syntax?.quickExercise
                          ),
                        });
                        return acc + detail.percentage;
                      }, 0) / total
                    )
                  : 0;

              return (
                <li key={block.id} className="px-5 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {block.order}. {block.title}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {finished}/{total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelHeader
            title="Study Consistency"
            subtitle={`${metrics.currentStreakDays}d current streak · ${metrics.longestStreakDays}d longest · ${metrics.totalStudyDays} qualifying days`}
          />
          <div className="p-5">
            <ActivityHeatmap
              dailyActivity={state.progress.dailyActivity}
              weeks={20}
            />
          </div>
        </Panel>
      </div>

      {/* Revision Recommendations + Activity History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader
            title="Revision Recommendations"
            subtitle="Immediate reviews (<70) and spaced-repetition units ready now"
          />
          {revisionQueue.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {revisionQueue.map((item) => {
                const found = findSubBlockById(
                  item.subBlockId,
                  AUTHORITATIVE_SYLLABUS
                );
                return (
                  <li
                    key={item.subBlockId}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectSubBlock(item.subBlockId);
                        navigateTo('workspace');
                      }}
                      className="min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.subBlockId} —{' '}
                        {found?.subBlock.title ?? item.subBlockId}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.reasons.join(' · ')}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.priority === 'spaced' ? (
                        <button
                          type="button"
                          onClick={() => markUnitRevised(item.subBlockId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Mark Revised</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          selectSubBlock(item.subBlockId);
                          navigateTo('workspace');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <span>Revisit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={RotateCcw}
              title="No revisions due right now"
              description={
                upcomingRevisions.length > 0
                  ? `${upcomingRevisions.length} completed or mastered unit(s) are scheduled for spaced revision in the next few days.`
                  : 'Units scoring below 70, manually flagged items, and completed/mastered FPT units due after 3–5 days appear here.'
              }
            />
          )}

          {upcomingRevisions.length > 0 ? (
            <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0D1119]/60">
              <div className="px-5 py-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Scheduled Spaced Revisions ({upcomingRevisions.length})
                </span>
              </div>
              <ul className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
                {upcomingRevisions.slice(0, 5).map((item) => {
                  const found = findSubBlockById(
                    item.subBlockId,
                    AUTHORITATIVE_SYLLABUS
                  );
                  return (
                    <li
                      key={item.subBlockId}
                      className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {item.subBlockId} —{' '}
                        {found?.subBlock.title ?? item.subBlockId}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                        Due in {item.daysUntilDue}d
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <PanelHeader
            title="Learning & Evaluation History"
            subtitle="Deterministic activity timeline"
          />
          {activityHistory.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-[380px] overflow-y-auto">
              {activityHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {entry.subBlockTitle}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {getMethodologyDefinition(entry.methodology).shortLabel}{' '}
                      <span aria-hidden="true">·</span> {entry.summary}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {formatRelativeTimestamp(entry.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={History}
              title="No learning history recorded"
              description="Submit an FPT answer, finish a practical exercise, or study for 5 minutes to record real progress history."
              actionLabel="Open Curriculum"
              onAction={() => navigateTo('curriculum')}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
