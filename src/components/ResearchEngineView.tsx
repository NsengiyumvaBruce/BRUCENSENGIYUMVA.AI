import React, { useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  Globe,
  Loader2,
  Search,
} from 'lucide-react';
import { getDisciplineById, getLevelById } from '../lib/pedagogy';
import type {
  DisciplineId,
  EducationalLevelId,
  ResearchBrief,
} from '../lib/pedagogy';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ResearchEngineViewProps {
  levelId: EducationalLevelId;
  disciplineId: DisciplineId;
  onSaveToNotebook: (params: {
    title: string;
    category: 'lesson' | 'math' | 'research';
    contentMarkdown: string;
  }) => void;
}

const SAMPLE_QUERIES = [
  'How do transformer attention mechanisms differ from recurrent neural networks?',
  'Recent evidence on ocean thermohaline circulation and climate feedback loops',
  'Primary mathematical ideas behind public-key RSA and elliptic-curve cryptography',
];

export const ResearchEngineView: React.FC<ResearchEngineViewProps> = ({
  levelId,
  disciplineId,
  onSaveToNotebook,
}) => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'overview' | 'deep'>('overview');
  const [isSearching, setIsSearching] = useState(false);
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [imgFailed, setImgFailed] = useState(false);

  const activeLevel = getLevelById(levelId);
  const activeDiscipline = getDisciplineById(disciplineId);

  const runSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || isSearching) return;

    setQuery(trimmed);
    setIsSearching(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          depth,
          levelId,
          disciplineId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Research query failed.');
      }
      setBrief(data as ResearchBrief);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete research synthesis.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveBrief = () => {
    if (!brief) return;
    const sourcesBlock =
      brief.citations.length > 0
        ? `\n\n### Grounded Sources\n${brief.citations.map((c) => `- [${c.title}](${c.uri})`).join('\n')}`
        : '';
    onSaveToNotebook({
      title: `Research: ${brief.query.slice(0, 56)}`,
      category: 'research',
      contentMarkdown: `${brief.summaryMarkdown}${sourcesBlock}`,
    });
    setSavedIds((prev) => ({ ...prev, [brief.id]: true }));
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
      {/* Research Hero & Query Bar */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Intelligent Academic Research Engine</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{activeLevel.label}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{activeDiscipline.label}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              Source-Grounded Academic Synthesis
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Investigate scientific discoveries, historical debates, or technical standards with live web-grounded citations and structured inquiry prompts.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            className="mt-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2.5">
              <label htmlFor="research-query-input" className="sr-only">
                Academic research topic or question
              </label>
              <input
                id="research-query-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a research topic, theorem, scientific mechanism, or question..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-700"
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer shrink-0"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" aria-hidden="true" />
                    <span>Search & Synthesize</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                role="group"
                aria-label="Synthesis depth"
              >
                <button
                  type="button"
                  onClick={() => setDepth('overview')}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    depth === 'overview'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Academic Overview
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('deep')}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    depth === 'deep'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Deep Synthesis
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 min-h-[200px]">
          {!imgFailed ? (
            <img
              src="/src/assets/images/research_archive_visual_1795010520773.jpg"
              alt="Academic reference books and research manuscripts on oak library table"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <Globe className="w-8 h-8 text-sky-700 dark:text-sky-400 mb-2" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Research Archive
              </span>
            </div>
          )}
        </div>
      </section>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-200"
        >
          {errorMsg}
        </div>
      )}

      {/* Results or Empty State */}
      {brief ? (
        <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {brief.depth === 'deep' ? 'Deep Synthesis' : 'Academic Overview'} ·{' '}
                {brief.citations.length} Grounded Sources
              </div>
              <h2 className="mt-0.5 font-display text-xl font-semibold text-slate-900 dark:text-slate-50">
                {brief.query}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleSaveBrief}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {savedIds[brief.id] ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-700 dark:text-emerald-400">Saved to Notebook</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Save Brief to Notebook</span>
                </>
              )}
            </button>
          </div>

          <MarkdownRenderer content={brief.summaryMarkdown} />

          {brief.citations.length > 0 && (
            <section aria-labelledby="citations-heading" className="pt-5 border-t border-slate-200 dark:border-slate-800">
              <h3 id="citations-heading" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Verified Reference Sources
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {brief.citations.map((cite, idx) => (
                  <a
                    key={cite.uri}
                    href={cite.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-sky-600 dark:hover:border-sky-500 transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                        Source {idx + 1}
                      </div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5">
                        {cite.title}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </article>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
            Sample Research Inquiries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_QUERIES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => runSearch(sample)}
                className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-sky-600 dark:hover:border-sky-500 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  {sample}
                </div>
                <div className="mt-2 text-xs font-medium text-sky-700 dark:text-sky-400">
                  Run grounded synthesis
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
