import React from 'react';
import { MessageSquare, Moon, Sun, Trash2, X } from 'lucide-react';
import {
  ACADEMIC_DISCIPLINES,
  EDUCATIONAL_LEVELS,
  getDisciplineById,
  getLevelById,
} from '../lib/pedagogy';
import type {
  DisciplineId,
  EducationalLevelId,
  StudySession,
} from '../lib/pedagogy';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  sessions: StudySession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  levelId: EducationalLevelId;
  onChangeLevel: (levelId: EducationalLevelId) => void;
  disciplineId: DisciplineId;
  onChangeDiscipline: (disciplineId: DisciplineId) => void;
  masteryIndex: number;
  savedNotesCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  levelId,
  onChangeLevel,
  disciplineId,
  onChangeDiscipline,
  masteryIndex,
  savedNotesCount,
  theme,
  onToggleTheme,
}) => {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-72 sm:w-64 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 lg:hidden">
        <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Chats & Settings
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Close study navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3.5 space-y-5 overflow-y-auto flex-1">
        {/* Recent Chats (ChatGPT / Claude style top placement) */}
        <section aria-labelledby="sessions-heading">
          <h2
            id="sessions-heading"
            className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2"
          >
            Recent Chats
          </h2>

          <ul className="space-y-1">
            {sessions.map((session) => {
              const isSelected = session.id === activeSessionId;
              const disc = getDisciplineById(session.disciplineId);
              const lvl = getLevelById(session.levelId);
              return (
                <li key={session.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`flex-1 min-w-0 text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800/70'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span className="text-sm font-medium truncate">{session.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate pl-5">
                      {lvl.shortLabel} · {disc.label}
                    </div>
                  </button>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label={`Delete session ${session.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Learner Adaptation Controls */}
        <section aria-labelledby="learner-profile-heading" className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2
              id="learner-profile-heading"
              className="text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Learner Settings
            </h2>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={theme === 'dark' ? 'Switch to light study mode' : 'Switch to dark study mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label
              htmlFor="educational-level-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Educational Level
            </label>
            <select
              id="educational-level-select"
              value={levelId}
              onChange={(e) => onChangeLevel(e.target.value as EducationalLevelId)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-700"
            >
              {EDUCATIONAL_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="discipline-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Primary Subject
            </label>
            <select
              id="discipline-select"
              value={disciplineId}
              onChange={(e) => onChangeDiscipline(e.target.value as DisciplineId)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-700"
            >
              {ACADEMIC_DISCIPLINES.map((disc) => (
                <option key={disc.id} value={disc.id}>
                  {disc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Mastery</div>
              <div className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                {masteryIndex}%
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Saved Notes</div>
              <div className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                {savedNotesCount}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Quiet Attribution Footer */}
      <footer className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        Developed by <span className="font-medium text-slate-700 dark:text-slate-300">BRUCE DIGITAL 360</span>
      </footer>
    </div>
  );

  return (
    <>
      <aside aria-label="Study workspace sidebar" className="hidden lg:block h-[calc(100dvh-3.5rem)] sticky top-14">
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside aria-label="Mobile study sidebar" className="relative z-10 h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
