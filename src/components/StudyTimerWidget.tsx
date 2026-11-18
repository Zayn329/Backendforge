import React from 'react';
import { Clock, Pause, Play, Square } from 'lucide-react';
import { useAppState } from '../persistence/AppStateContext';
import { cn } from '../utilities';

interface StudyTimerWidgetProps {
  subBlockId: string;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function StudyTimerWidget({ subBlockId }: StudyTimerWidgetProps) {
  const {
    state,
    timerElapsedSeconds,
    startStudyTimer,
    pauseStudyTimer,
    resumeStudyTimer,
    stopStudyTimer,
  } = useAppState();

  const timer = state.progress.studyTimer;
  const hasSession = timer.isRunning || timer.accumulatedSeconds > 0;
  const targetId = timer.subBlockId ?? subBlockId;
  const milestoneReached = timerElapsedSeconds >= 300;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0E131B]">
      <div className="flex items-center gap-3 min-w-0">
        <Clock
          className={cn(
            'w-4 h-4 shrink-0',
            timer.isRunning
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-400'
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatDuration(timerElapsedSeconds)}
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="text-slate-600 dark:text-slate-400 truncate">
              {hasSession
                ? `Unit ${targetId}${milestoneReached ? ' · Streak credit earned' : ' · 5m for streak'}`
                : 'Focus timer ready'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!hasSession ? (
          <button
            type="button"
            onClick={() => startStudyTimer(subBlockId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161C26] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3" aria-hidden="true" />
            <span>Start Timer</span>
          </button>
        ) : (
          <>
            {timer.isRunning ? (
              <button
                type="button"
                onClick={pauseStudyTimer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161C26] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
              >
                <Pause className="w-3 h-3" aria-hidden="true" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeStudyTimer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161C26] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3" aria-hidden="true" />
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={stopStudyTimer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161C26] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3" aria-hidden="true" />
              <span>Stop & Save</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
