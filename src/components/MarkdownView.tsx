import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utilities';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className }: MarkdownViewProps) {
  return (
    <div
      className={cn(
        'text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-4',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-6">{children}</li>,
          code: ({ className: codeClassName, children }) => {
            const isBlock = Boolean(codeClassName?.includes('language-'));
            if (isBlock) {
              return (
                <code className="block font-mono text-[13px] leading-6 text-slate-800 dark:text-slate-200 overflow-x-auto">
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] overflow-x-auto">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] text-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-sm text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-[#141A24] border-b border-slate-200 dark:border-slate-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-slate-200/70 dark:border-slate-800/60">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
