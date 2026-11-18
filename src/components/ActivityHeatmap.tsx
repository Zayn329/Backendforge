import React, { useMemo, useState } from 'react';
import { buildHeatmapCells, HeatmapCell } from '../progress';
import { DailyStudyRecord } from '../types';
import { cn, formatShortDate } from '../utilities';

interface ActivityHeatmapProps {
  dailyActivity: Record<string, DailyStudyRecord>;
  weeks?: number;
}

const LEVEL_STYLES: Record<HeatmapCell['level'], string> = {
  0: 'bg-slate-100 dark:bg-[#161C26] border-slate-200/70 dark:border-slate-800/70',
  1: 'bg-blue-200 dark:bg-blue-950/90 border-blue-300 dark:border-blue-900',
  2: 'bg-blue-400 dark:bg-blue-800 border-blue-500/60 dark:border-blue-700',
  3: 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500',
  4: 'bg-blue-600 dark:bg-blue-500 border-blue-700 dark:border-blue-400',
};

export function ActivityHeatmap({
  dailyActivity,
  weeks = 18,
}: ActivityHeatmapProps) {
  const cells = useMemo(
    () => buildHeatmapCells(dailyActivity, weeks),
    [dailyActivity, weeks]
  );

  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  const columns = useMemo(() => {
    const grouped: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      grouped.push(cells.slice(i, i + 7));
    }
    return grouped;
  }, [cells]);

  const totalSessions = useMemo(
    () => cells.reduce((sum, cell) => sum + cell.count, 0),
    [cells]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          {totalSessions === 0
            ? `0 study sessions recorded in the last ${weeks} weeks`
            : `${totalSessions} study ${totalSessions === 1 ? 'session' : 'sessions'} in the last ${weeks} weeks`}
        </span>
        {selectedCell ? (
          <span className="tabular-nums text-slate-700 dark:text-slate-300">
            {formatShortDate(selectedCell.date)} · {selectedCell.count}{' '}
            {selectedCell.count === 1 ? 'session' : 'sessions'}
          </span>
        ) : (
          <span>Select a day cell to inspect</span>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          className="inline-flex gap-1.5"
          role="grid"
          aria-label="Study activity heatmap"
        >
          <div className="grid grid-rows-7 gap-1.5 pr-1 text-[10px] text-slate-400 dark:text-slate-500 select-none">
            <span className="h-3.5 leading-[14px]" />
            <span className="h-3.5 leading-[14px]">Mon</span>
            <span className="h-3.5 leading-[14px]" />
            <span className="h-3.5 leading-[14px]">Wed</span>
            <span className="h-3.5 leading-[14px]" />
            <span className="h-3.5 leading-[14px]">Fri</span>
            <span className="h-3.5 leading-[14px]" />
          </div>

          {columns.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-rows-7 gap-1.5">
              {week.map((cell) => {
                const isSelected = selectedCell?.date === cell.date;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedCell(cell)}
                    onMouseEnter={() => setSelectedCell(cell)}
                    title={`${formatShortDate(cell.date)}: ${cell.count} sessions`}
                    aria-label={`${formatShortDate(cell.date)}: ${cell.count} sessions`}
                    className={cn(
                      'w-3.5 h-3.5 rounded-[3px] border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      LEVEL_STYLES[cell.level],
                      isSelected && 'ring-1 ring-slate-900 dark:ring-slate-100'
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className={cn(
              'w-3 h-3 rounded-[2px] border inline-block',
              LEVEL_STYLES[level]
            )}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
