import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { cn } from '../utilities';

interface CodeBlockProps {
  code: string;
  title?: string;
  language?: string;
  isCommand?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  title,
  language,
  isCommand = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be blocked in restricted contexts
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-[#10151E]">
        <div className="flex items-center gap-2 min-w-0 text-xs text-slate-600 dark:text-slate-400">
          {isCommand ? (
            <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          ) : null}
          <span className="font-medium truncate">
            {title ?? (isCommand ? 'Terminal command' : language ?? 'Code')}
          </span>
          {!isCommand && language ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {language}
              </span>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#161C26] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2634] transition-colors shrink-0 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-3.5 overflow-x-auto text-[13px] leading-6 font-mono text-slate-800 dark:text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
