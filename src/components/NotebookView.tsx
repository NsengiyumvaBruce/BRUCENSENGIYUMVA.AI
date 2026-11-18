import React, { useMemo, useState } from 'react';
import { BookOpen, Download, Search, Trash2 } from 'lucide-react';
import {
  formatNotebookMarkdown,
  getDisciplineById,
  getLevelById,
} from '../lib/pedagogy';
import type { NotebookEntry } from '../lib/pedagogy';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NotebookViewProps {
  entries: NotebookEntry[];
  masterySummary: {
    totalSessions: number;
    totalTurns: number;
    savedNotesCount: number;
    averagePracticeScore: number;
    masteryIndex: number;
  };
  onDeleteEntry: (id: string) => void;
  onStartLesson: () => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  entries,
  masterySummary,
  onDeleteEntry,
  onStartLesson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'lesson' | 'math' | 'research'>('all');

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
      const matchesText =
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.contentMarkdown.toLowerCase().includes(q);
      return matchesCategory && matchesText;
    });
  }, [entries, searchQuery, categoryFilter]);

  const handleExportMarkdown = () => {
    const md = formatNotebookMarkdown(entries);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brucensengiyumva-ai-notebook-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
      {/* Top 4-Column Tabular Mastery Ledger */}
      <section aria-labelledby="ledger-heading">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 id="ledger-heading" className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Study Notebook & Mastery Ledger
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Saved lesson explanations, verified math derivations, and grounded research briefs stored locally in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Export Markdown</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Mastery Index</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {masterySummary.masteryIndex}%
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Active Study Sessions</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {masterySummary.totalSessions}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Practice Check Average</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {masterySummary.averagePracticeScore}%
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Saved Notebook Entries</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {masterySummary.savedNotesCount}
            </div>
          </div>
        </div>
      </section>

      {/* Search & Segmented Category Filter */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <label htmlFor="notebook-search" className="sr-only">
            Filter saved notes
          </label>
          <input
            id="notebook-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved lessons, theorems, or notes..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-700"
          />
        </div>

        <div
          className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start"
          role="group"
          aria-label="Filter notes by category"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'lesson', label: 'Lessons' },
              { id: 'math', label: 'Math' },
              { id: 'research', label: 'Research' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notes List or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {entries.length === 0 ? 'Your Study Notebook is Empty' : 'No Matching Notes Found'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {entries.length === 0
              ? 'Save explanations from the Personal Tutor, worked derivations from the Math Lab, or research briefs to build your personal reference library.'
              : 'Try adjusting your search keywords or switching the category filter.'}
          </p>
          {entries.length === 0 && (
            <button
              type="button"
              onClick={onStartLesson}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer"
            >
              Start a Lesson
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const disciplineLabel = getDisciplineById(entry.disciplineId).label;
            const levelLabel = getLevelById(entry.levelId).shortLabel;
            const categoryLabel =
              entry.category === 'math'
                ? 'Mathematics'
                : entry.category === 'research'
                  ? 'Research Brief'
                  : 'Lesson Note';

            return (
              <article
                key={entry.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span>{categoryLabel}</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span>{disciplineLabel}</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span>{levelLabel}</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span className="tabular-nums">{entry.createdAt.slice(0, 10)}</span>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {entry.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    aria-label={`Delete note ${entry.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <MarkdownRenderer content={entry.contentMarkdown} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
