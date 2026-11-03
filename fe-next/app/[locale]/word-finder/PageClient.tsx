'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { groupByLength } from '../tools/word-solver/wordList';
import { buildFinderBody, canSearch, type FinderRequest } from './finderRequest';

const LENGTH_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const inputClass = cn(
  'w-full px-3 py-2.5 text-lg font-mono font-bold tracking-widest',
  'bg-white text-neo-black border-3 border-neo-black rounded-neo',
  'shadow-hard-sm focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
  'placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-normal placeholder:text-base',
);
const labelClass = 'block font-neo-display text-sm font-bold text-neo-white mb-1.5';

const EMPTY: FinderRequest = { letters: '', pattern: '', startsWith: '', endsWith: '', contains: '', length: null };

export default function WordFinderPageClient() {
  const [form, setForm] = useState<FinderRequest>(EMPTY);
  const [results, setResults] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [capped, setCapped] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    (key: keyof FinderRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: key === 'length' ? (value ? Number(value) : null) : value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!canSearch(form)) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/word-solver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildFinderBody(form)),
        });
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        if (!res.ok) throw new Error(data.error || 'Request failed');
        setResults(data.words);
        setTotal(data.total);
        setCapped(Boolean(data.capped));
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [form],
  );

  const handleClear = useCallback(() => {
    setForm(EMPTY);
    setResults([]);
    setTotal(0);
    setCapped(false);
    setHasSearched(false);
    setError(null);
  }, []);

  const grouped = useMemo(() => groupByLength(results), [results]);

  return (
    <div dir="ltr" className="bg-neo-navy">
      <AutoHideHeader />
      <main className="max-w-4xl mx-auto px-4 pt-8">
        <header className="mb-8 text-center">
          <h1 className="font-neo-display text-3xl sm:text-4xl font-bold text-neo-yellow mb-2" data-speakable="true">
            Word Finder: Find Words With Your Letters
          </h1>
          <p className="text-neo-white text-lg">
            Enter your letters, lock any letters you already know in their spots, and get every matching word.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-neo-navy-light border-3 border-neo-black shadow-hard rounded-neo p-5 sm:p-6 mb-6"
          aria-label="Word finder"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="wf-letters" className={labelClass}>Your letters (use ? for a blank tile)</label>
              <input
                id="wf-letters"
                value={form.letters}
                onChange={set('letters')}
                placeholder="e.g. retains?"
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wf-pattern" className={labelClass}>Pattern (_ for an unknown letter)</label>
              <input
                id="wf-pattern"
                value={form.pattern}
                onChange={set('pattern')}
                placeholder="e.g. c_a_e"
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wf-starts" className={labelClass}>Starts with</label>
              <input id="wf-starts" value={form.startsWith} onChange={set('startsWith')} maxLength={20} autoComplete="off" spellCheck={false} className={inputClass} />
            </div>
            <div>
              <label htmlFor="wf-ends" className={labelClass}>Ends with</label>
              <input id="wf-ends" value={form.endsWith} onChange={set('endsWith')} maxLength={20} autoComplete="off" spellCheck={false} className={inputClass} />
            </div>
            <div>
              <label htmlFor="wf-contains" className={labelClass}>Contains</label>
              <input id="wf-contains" value={form.contains} onChange={set('contains')} maxLength={20} autoComplete="off" spellCheck={false} className={inputClass} />
            </div>
            <div>
              <label htmlFor="wf-length" className={labelClass}>Word length</label>
              <select id="wf-length" value={form.length ?? ''} onChange={set('length')} className={inputClass}>
                <option value="">Any length</option>
                {LENGTH_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} letters</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-slate-300 text-sm mt-4">
            Fill in your letters, a pattern, or both. Letters already in the pattern are on the board, so your letters
            only need to cover the blanks.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!canSearch(form) || isLoading}
              className={cn(
                'px-6 py-3 font-neo-display font-bold text-lg',
                'bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed transition-shadow duration-100',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-hard',
              )}
            >
              {isLoading ? 'Searching…' : 'Find words'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-3 font-neo-display font-bold bg-slate-600 text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed transition-shadow duration-100"
            >
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-900/50 border-3 border-red-500 rounded-neo p-4 mb-6 text-red-200" role="alert">
            {error}
          </div>
        )}

        {hasSearched && !error && (
          <section className="mb-8" aria-live="polite">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="font-neo-display text-2xl font-bold text-white">Matching words</h2>
              {total > 0 && (
                <span className="bg-neo-cyan text-neo-black font-bold px-3 py-1 border-3 border-neo-black rounded-neo text-sm">
                  {total} found{capped && ' (showing first 500)'}
                </span>
              )}
            </div>
            {total === 0 ? (
              <p className="text-neo-white text-lg bg-neo-navy-light border-3 border-neo-black rounded-neo p-6 text-center">
                No words match. Try fewer filters, a shorter pattern, or add a ? blank.
              </p>
            ) : (
              <div className="space-y-4">
                {grouped.map(([len, words]) => (
                  <div key={len} className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-4">
                    <h3 className="font-neo-display font-bold text-neo-orange mb-3">
                      {len}-letter words ({words.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {words.map((word) => (
                        <span
                          key={word}
                          className="px-3 py-1.5 font-mono font-bold text-sm bg-neo-navy text-white border-2 border-neo-black rounded-neo shadow-hard-sm"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
