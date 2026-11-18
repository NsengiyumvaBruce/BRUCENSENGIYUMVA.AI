import React from 'react';
import { Menu, Plus } from 'lucide-react';
import type { WorkspaceTab } from '../lib/pedagogy';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onNewLesson: () => void;
  onToggleMobileSidebar: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string; mobileLabel: string }> = [
  { id: 'tutor', label: 'Chat Tutor', mobileLabel: 'Chat' },
  { id: 'math_lab', label: 'Math Solver', mobileLabel: 'Math' },
  { id: 'research', label: 'Research', mobileLabel: 'Research' },
  { id: 'notebook', label: 'Notebook', mobileLabel: 'Notebook' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onNewLesson,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 md:gap-8 px-3 sm:px-4 lg:px-6 h-13 sm:h-14">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700 cursor-pointer shrink-0"
            aria-label="Open study navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('tutor');
            }}
            className="font-display text-sm sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap truncate"
          >
            BRUCENSENGIYUMVA AI
          </a>
        </div>

        {/* Zone 2: 4 single-line text navigation tabs */}
        <nav aria-label="Workspace sections" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700 ${
                  isActive
                    ? 'text-sky-700 dark:text-sky-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-700 dark:bg-sky-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onNewLesson}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile workspace sections"
        className="flex md:hidden items-center justify-around border-t border-slate-100 dark:border-slate-900 px-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-2.5 px-3 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                isActive
                  ? 'border-sky-700 text-sky-700 dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.mobileLabel}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
