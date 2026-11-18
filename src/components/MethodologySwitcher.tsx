import React from 'react';
import { LEARNING_METHODOLOGIES } from '../learning';
import { LearningMethodology } from '../types';
import { cn } from '../utilities';

interface MethodologySwitcherProps {
  value: LearningMethodology;
  onChange: (methodology: LearningMethodology) => void;
  compact?: boolean;
}

export function MethodologySwitcher({
  value,
  onChange,
  compact = false,
}: MethodologySwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Learning methodology"
      className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0B0E14]"
    >
      {LEARNING_METHODOLOGIES.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[34px]',
              isActive
                ? 'bg-white dark:bg-[#18202F] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
            )}
          >
            {compact ? item.shortLabel : item.label}
          </button>
        );
      })}
    </div>
  );
}
