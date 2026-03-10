'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AdPlaceholder } from '@/components/ads';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { getContent } from './content';
import { findWords, groupByLength } from './wordList';

export default function WordSolverPageClient() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const content = useMemo(() => getContent(locale), [locale]);
  const isRtl = locale === 'he';

  const [letters, setLetters] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSolve = useCallback(() => {
    const found = findWords(letters);
    setResults(found);
    setHasSearched(true);
  }, [letters]);

  const handleClear = useCallback(() => {
    setLetters('');
    setResults([]);
    setHasSearched(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSolve();
    },
    [handleSolve]
  );

  const grouped = useMemo(() => groupByLength(results), [results]);
  const totalWords = results.length;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <header className="mb-8 text-center">
          <h1
            className="font-neo-display text-3xl sm:text-4xl font-bold text-neo-yellow mb-2"
            data-speakable="true"
          >
            {content.title}
          </h1>
          <p className="text-neo-cream/80 text-lg">{content.subtitle}</p>
        </header>

        {/* Input Section */}
        <section
          className="bg-slate-800 border-3 border-neo-black shadow-hard rounded-neo p-6 mb-6"
          aria-label={content.inputLabel}
        >
          <label
            htmlFor="letter-input"
            className="block font-neo-display text-lg font-bold text-white mb-3"
          >
            {content.inputLabel}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="letter-input"
              type="text"
              value={letters}
              onChange={(e) => setLetters(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder={content.inputPlaceholder}
              maxLength={15}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'flex-1 px-4 py-3 text-xl font-mono font-bold tracking-widest',
                'bg-white text-neo-black border-3 border-neo-black rounded-neo',
                'shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan',
                'placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-normal'
              )}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSolve}
                disabled={letters.length < 2}
                className={cn(
                  'px-6 py-3 font-neo-display font-bold text-lg',
                  'bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]',
                  'transition-all duration-100 active:animate-neo-press',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-hard disabled:hover:translate-x-0 disabled:hover:translate-y-0'
                )}
              >
                {content.solveButton}
              </button>
              <button
                onClick={handleClear}
                className={cn(
                  'px-4 py-3 font-neo-display font-bold',
                  'bg-slate-600 text-white border-3 border-neo-black rounded-neo',
                  'shadow-hard-sm hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]',
                  'transition-all duration-100'
                )}
              >
                {content.clearButton}
              </button>
            </div>
          </div>
        </section>

        {/* Ad between input and results */}
        <AdPlaceholder zone="content-page" />

        {/* Results */}
        {hasSearched && (
          <section className="mb-8" aria-live="polite">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-neo-display text-2xl font-bold text-white">
                {content.resultsTitle}
              </h2>
              {totalWords > 0 && (
                <span className="bg-neo-cyan text-neo-black font-bold px-3 py-1 border-3 border-neo-black rounded-neo text-sm">
                  {totalWords} {content.wordsFound}
                </span>
              )}
            </div>

            {totalWords === 0 ? (
              <p className="text-neo-cream/70 text-lg bg-slate-800 border-3 border-neo-black rounded-neo p-6 text-center">
                {content.noResults}
              </p>
            ) : (
              <>
                <div className="space-y-4">
                  {grouped.map(([len, words]) => (
                    <div
                      key={len}
                      className="bg-slate-800 border-3 border-neo-black rounded-neo p-4"
                    >
                      <h3 className="font-neo-display font-bold text-neo-orange mb-3">
                        {len}{content.letterWords} ({words.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {words.map((word) => (
                          <span
                            key={word}
                            className={cn(
                              'px-3 py-1.5 font-mono font-bold uppercase text-sm',
                              'bg-neo-navy text-white border-2 border-neo-black rounded-neo',
                              'shadow-hard-sm'
                            )}
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-neo-cream/60 text-sm mt-4 italic">
                  {content.fullDictionaryNote}
                </p>
              </>
            )}
          </section>
        )}

        {/* CTA */}
        <section className="bg-neo-yellow border-3 border-neo-black shadow-hard rounded-neo p-6 mb-8 text-center">
          <h2
            className="font-neo-display text-2xl font-bold text-neo-black mb-2"
            data-speakable="true"
          >
            {content.ctaTitle}
          </h2>
          <p className="text-neo-black/80 mb-4">{content.ctaDescription}</p>
          <Link
            href={`/${locale}/singleplayer`}
            className={cn(
              'inline-block px-8 py-3 font-neo-display font-bold text-lg',
              'bg-neo-navy text-white border-3 border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]',
              'transition-all duration-100'
            )}
          >
            {content.ctaButton}
          </Link>
        </section>

        {/* How To Use */}
        <section
          className="bg-slate-800 border-3 border-neo-black rounded-neo p-6 mb-8"
          data-speakable="true"
        >
          <h2 className="font-neo-display text-2xl font-bold text-white mb-4">
            {content.howToTitle}
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-neo-cream/90">
            {content.howToSteps.map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
        </section>

        {/* Tips */}
        <section className="mb-8">
          <h2 className="font-neo-display text-2xl font-bold text-white mb-4">
            Word Game Tips
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {content.tips.map((tip, i) => (
              <article
                key={i}
                className="bg-slate-800 border-3 border-neo-black rounded-neo p-4"
              >
                <h3 className="font-neo-display font-bold text-neo-cyan mb-2">
                  {tip.title}
                </h3>
                <p className="text-neo-cream/80 text-sm leading-relaxed">
                  {tip.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8" data-speakable="true">
          <h2 className="font-neo-display text-2xl font-bold text-white mb-4">
            {content.faqTitle}
          </h2>
          <div className="space-y-4">
            {content.faqs.map((faq, i) => (
              <details
                key={i}
                className="bg-slate-800 border-3 border-neo-black rounded-neo p-4 group"
              >
                <summary className="font-neo-display font-bold text-neo-orange cursor-pointer list-none flex items-center justify-between">
                  {faq.question}
                  <span className="text-neo-cream/60 group-open:rotate-180 transition-transform">
                    &#9660;
                  </span>
                </summary>
                <p className="text-neo-cream/80 mt-3 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
