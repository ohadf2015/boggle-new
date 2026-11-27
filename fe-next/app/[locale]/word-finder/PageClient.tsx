'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { LandingPage } from '@/components/landing/kit';
import { CLEAR_BUTTON, ERROR_BOX, PAPER, SOLVE_BUTTON, TEXT_INPUT, WORD_CHIP } from '../tools/word-solver/solverStyles';
import { groupByLength } from '../tools/word-solver/wordList';
import { buildFinderBody, canSearch, type FinderRequest } from './finderRequest';

const LENGTH_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const inputClass = cn(TEXT_INPUT, 'min-h-12 px-3 py-2.5 text-lg placeholder:text-base');
const labelClass = 'mb-1.5 block text-sm font-bold';

const EMPTY: FinderRequest = { letters: '', pattern: '', startsWith: '', endsWith: '', contains: '', length: null };

export default function WordFinderPageClient({ children }: { children?: React.ReactNode }) {
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
    <div dir="ltr" className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale="en" topBar={false}>
        <div className="flex flex-col gap-6">
        <header className="flex max-w-3xl flex-col gap-4 lg:pt-6">
          <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl" data-speakable="true">
            Word Finder: Find Words With Your Letters
          </h1>
          <p className="text-lg leading-relaxed text-neo-white/85">
            Enter your letters, lock any letters you already know in their spots, and get every matching word.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className={cn(PAPER, 'p-5 sm:p-7')}
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
          <p className="mt-4 text-sm text-neo-black/75">
            Fill in your letters, a pattern, or both. Letters already in the pattern are on the board, so your letters
            only need to cover the blanks.
          </p>
          <div className="mt-4 flex gap-3 sm:max-w-md">
            <button
              type="submit"
              disabled={!canSearch(form) || isLoading}
              className={SOLVE_BUTTON}
            >
              {isLoading ? 'Searching…' : 'Find words'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className={CLEAR_BUTTON}
            >
              Clear
            </button>
          </div>
        </form>
        </div>

        {error && (
          <div className={ERROR_BOX} role="alert">
            {error}
          </div>
        )}

        {hasSearched && !error && (
          <section aria-live="polite">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="font-neo-display text-2xl font-bold">Matching words</h2>
              {total > 0 && (
                <span className="rounded-full border-3 border-neo-black bg-neo-cyan px-3 py-1 text-sm font-bold text-neo-black">
                  {total} found{capped && ' (showing first 500)'}
                </span>
              )}
            </div>
            {total === 0 ? (
              <p className={cn(PAPER, 'p-6 text-center text-lg')}>
                No words match. Try fewer filters, a shorter pattern, or add a ? blank.
              </p>
            ) : (
              <div className="space-y-4">
                {grouped.map(([len, words]) => (
                  <div key={len} className={cn(PAPER, 'p-4 shadow-hard-lg')}>
                    <h3 className="mb-3 font-neo-display font-bold">
                      {len}-letter words ({words.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {words.map((word) => (
                        <span
                          key={word}
                          className={WORD_CHIP}
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
        {children}
      </LandingPage>
    </div>
  );
}
