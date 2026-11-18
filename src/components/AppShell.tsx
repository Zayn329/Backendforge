import React from 'react';
import {
  BookOpen,
  Code2,
  LayoutDashboard,
  Moon,
  Settings,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { useAppState } from '../persistence/AppStateContext';
import { AppSection, NavigationItem } from '../types';
import { cn } from '../utilities';

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    description: 'Overview, study streaks, and revision queue',
  },
  {
    id: 'curriculum',
    label: 'Curriculum',
    shortLabel: 'Syllabus',
    description: 'Browse backend engineering blocks and sub-blocks',
  },
  {
    id: 'workspace',
    label: 'Learning Workspace',
    shortLabel: 'Workspace',
    description: 'Active study across FPT, Recipe, and Syntax modes',
  },
  {
    id: 'progress',
    label: 'Progress',
    shortLabel: 'Progress',
    description: 'Completion metrics, activity history, and retention',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    description: 'Appearance, Groq API key, and local data backup',
  },
] as const;

const NAV_ICONS: Record<AppSection, React.ComponentType<{ className?: string }>> =
  {
    dashboard: LayoutDashboard,
    curriculum: BookOpen,
    workspace: Code2,
    progress: TrendingUp,
    settings: Settings,
  };

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { state, activeSection, navigateTo, setTheme } = useAppState();
  const isDark = state.settings.theme === 'dark';

  const currentNav =
    NAVIGATION_ITEMS.find((item) => item.id === activeSection) ??
    NAVIGATION_ITEMS[0];

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100">
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0E131B] z-20">
        <div className="h-14 px-5 flex items-center border-b border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Backend Forge
          </button>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        >
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isActive
                    ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161C26] hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161C26] hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="flex items-center gap-2.5">
              {isDark ? (
                <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Toggle
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-60 lg:pl-64 min-w-0">
        {/* Top Bar (Desktop sticky, Mobile non-sticky to respect mobile sticky budget) */}
        <header className="h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B0E14]/95 md:sticky md:top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="md:hidden font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Backend Forge
            </button>
            <span
              className="md:hidden text-slate-300 dark:text-slate-700"
              aria-hidden="true"
            >
              /
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentNav.label}
              </h1>
              <span
                className="hidden lg:inline text-slate-300 dark:text-slate-700"
                aria-hidden="true"
              >
                ·
              </span>
              <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentNav.description}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {activeSection !== 'workspace' ? (
              <button
                type="button"
                onClick={() => navigateTo('workspace')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Open Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('curriculum')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Browse Curriculum
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (5 sections, >=44px touch targets, <= 10% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0E131B]/95 backdrop-blur-md grid grid-cols-5"
      >
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.id];
          const isActive = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full px-1">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
