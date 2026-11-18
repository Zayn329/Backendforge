import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Flame,
  History,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  ActivityHeatmap,
  EmptyState,
  Panel,
  PanelHeader,
} from '../components';
import { hasLessonContent } from '../content';
import { AUTHORITATIVE_SYLLABUS, findSubBlockById } from '../curriculum';
import { getMethodologyDefinition } from '../learning';
import { useAppState } from '../persistence/AppStateContext';
import {
  computeProgressMetrics,
  getRecentActivity,
  getRevisionRecommendations,
} from '../progress';
import { formatRelativeTimestamp } from '../utilities';

export function DashboardPage() {
  const { state, navigateTo, selectSubBlock } = useAppState();

  const metrics = useMemo(
    () => computeProgressMetrics(state.progress, AUTHORITATIVE_SYLLABUS),
    [state.progress]
  );

  const currentSelection = useMemo(
    () =>
      findSubBlockById(
        state.progress.currentSubBlockId,
        AUTHORITATIVE_SYLLABUS
      ),
    [state.progress.currentSubBlockId]
  );

  const recentActivity = useMemo(
    () => getRecentActivity(state.progress, 8),
    [state.progress]
  );

  const revisionQueue = useMemo(
    () => getRevisionRecommendations(state.progress),
    [state.progress]
  );

  const currentMethodology = getMethodologyDefinition(
    state.progress.currentMethodology
  );

  const finishedCount = metrics.completedUnits + metrics.masteredUnits;

  return (
    <div className="space-y-6">
      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Curriculum Completion</span>
            <Layers
              className="w-4 h-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.completionPercentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {finishedCount} / {metrics.totalUnits} units
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${metrics.completionPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {metrics.completedUnits} completed · {metrics.masteredUnits}{' '}
            mastered · {metrics.skippedUnits} skipped
          </p>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Current Streak</span>
            <Flame
              className="w-4 h-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.currentStreakDays}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {metrics.currentStreakDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Longest streak: {metrics.longestStreakDays}{' '}
            {metrics.longestStreakDays === 1 ? 'day' : 'days'}
          </p>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Study Days</span>
            <Calendar
              className="w-4 h-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.totalStudyDays}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {metrics.totalStudyDays === 1
                ? 'qualifying day'
                : 'qualifying days'}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Active mode: {currentMethodology.label}
          </p>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Mastery & Revision</span>
            <Award
              className="w-4 h-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.masteredUnits}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              mastered ({metrics.masteryPercentage}%)
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {metrics.revisionUnitsCount === 0
              ? '0 units flagged for revision'
              : `${metrics.revisionUnitsCount} units recommended for revision`}
          </p>
        </Panel>
      </div>

      {/* Current Learning Unit + Revision Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Current Learning Unit"
            subtitle="Resume your active syllabus unit or start Block 0"
            action={
              <button
                type="button"
                onClick={() => navigateTo('curriculum')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Explore 17 Blocks</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            }
          />

          {currentSelection ? (
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Block {currentSelection.block.order} ·{' '}
                    {currentSelection.subBlock.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentSelection.subBlock.learningMode}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {currentSelection.subBlock.topics.length} objectives
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentSelection.subBlock.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hasLessonContent(currentSelection.subBlock.id)
                    ? 'Interactive lesson content and exercises ready.'
                    : 'Syllabus overview ready; detailed lesson content pending batch population.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('workspace')}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Resume Unit
              </button>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Ready to begin Block 0"
              description="The 17-block authoritative backend engineering syllabus (86 units, 726 objectives) is loaded. Open 0.1 Type System Fundamentals or browse the curriculum."
              actionLabel="Start 0.1 — Type System Fundamentals"
              onAction={() => {
                selectSubBlock('0.1', 'fpt');
                navigateTo('workspace');
              }}
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Revision Recommendations"
            subtitle="Low scores, misconceptions, or unmastered units"
          />
          {revisionQueue.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {revisionQueue.slice(0, 5).map((item) => {
                const found = findSubBlockById(
                  item.subBlockId,
                  AUTHORITATIVE_SYLLABUS
                );
                return (
                  <li key={item.subBlockId}>
                    <button
                      type="button"
                      onClick={() => {
                        selectSubBlock(item.subBlockId);
                        navigateTo('workspace');
                      }}
                      className="w-full px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-[#161C26] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.subBlockId} —{' '}
                          {found?.subBlock.title ?? item.subBlockId}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.reasons[0]}
                        </p>
                      </div>
                      <ArrowRight
                        className="w-4 h-4 text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={RotateCcw}
              title="Revision queue is clear"
              description="Units scoring below mastery (85+), showing misconceptions, or flagged manually will appear here."
            />
          )}
        </Panel>
      </div>

      {/* Activity Heatmap */}
      <Panel>
        <PanelHeader
          title="Study Activity Heatmap"
          subtitle="Qualifying daily study activity in your local timezone (last 18 weeks)"
        />
        <div className="p-5">
          <ActivityHeatmap
            dailyActivity={state.progress.dailyActivity}
            weeks={18}
          />
        </div>
      </Panel>

      {/* Recent Activity */}
      <Panel>
        <PanelHeader
          title="Recent Activity"
          subtitle="Genuine study events recorded from submissions, exercises, and focused timer sessions"
          action={
            <button
              type="button"
              onClick={() => navigateTo('progress')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>View Full Progress</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          }
        />
        {recentActivity.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {entry.subBlockTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {getMethodologyDefinition(entry.methodology).label}{' '}
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
            title="No qualifying study activity yet"
            description="Submit an FPT answer, complete a Recipe or Syntax exercise, or track 5 minutes of focused study to log your first qualifying day."
          />
        )}
      </Panel>
    </div>
  );
}
