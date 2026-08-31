'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { InlineBannerAd } from "@/components/ads";
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { getContent } from './content';
import { findWordsApi, groupByLength } from './wordList';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'he', label: '\u05E2\u05D1\u05E8\u05D9\u05EA', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'sv', label: 'Svenska', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'es', label: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}' },
] as const;

export default function WordSolverPageClient() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const content = useMemo(() => getContent(locale), [locale]);
  const isRtl = locale === 'he';

  const [letters, setLetters] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [wasCapped, setWasCapped] = useState(false);
  const [solverLang, setSolverLang] = useState(
    LANGUAGES.some(l => l.code === locale) ? locale : 'en'
  );

  const handleSolve = useCallback(async () => {
    if (letters.length < 2) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await findWordsApi(letters, solverLang);
      setResults(data.words);
      setTotalCount(data.total);
      setWasCapped(data.capped);
      setHasSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [letters, solverLang]);

  const handleClear = useCallback(() => {
    setLetters('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    setTotalCount(0);
    setWasCapped(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSolve();
    },
    [handleSolve]
  );

  const grouped = useMemo(() => groupByLength(results), [results]);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1
            className="font-neo-display text-3xl sm:text-4xl font-bold text-neo-yellow mb-2"
            data-speakable="true"
          >
            {content.title}
          </h1>
          <p className="text-neo-white text-lg">{content.subtitle}</p>
        </header>

        <section
          className="bg-neo-navy-light border-3 border-neo-black shadow-hard rounded-neo p-6 mb-6"
          aria-label={content.inputLabel}
        >
          <div className="mb-4">
            <label
              htmlFor="solver-language"
              className="block font-neo-display text-sm font-bold text-neo-white mb-2"
            >
              {content.languageLabel}
            </label>
            <div className="flex flex-wrap gap-2" id="solver-language">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSolverLang(lang.code)}
                  className={cn(
                    'px-3 py-1.5 font-neo-display font-bold text-sm',
                    'border-2 border-neo-black rounded-neo transition-all duration-100',
                    solverLang === lang.code
                      ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                      : 'bg-neo-navy-elevated text-white hover:bg-slate-600'
                  )}
                >
                  <span className="me-1">{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

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
              onChange={(e) => setLetters(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={content.inputPlaceholder}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'flex-1 px-4 py-3 text-xl font-mono font-bold tracking-widest',
                'bg-white text-neo-black border-3 border-neo-black rounded-neo',
                'shadow-hard-sm focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
                'placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-normal'
              )}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSolve}
                disabled={letters.length < 2 || isLoading}
                className={cn(
                  'px-6 py-3 font-neo-display font-bold text-lg',
                  'bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo',
                  // Shadow-only press feedback: hover/active translate + neo-press
                  // move the hit target, so the first Find Words tap often missed
                  // (pointerup landed off-button) and needed a second press.
                  'shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed',
                  'transition-shadow duration-100',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-hard'
                )}
              >
                {isLoading ? content.searchingText : content.solveButton}
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

        <InlineBannerAd webZone="content-page" />

        {error && (
          <div className="bg-red-900/50 border-3 border-red-500 rounded-neo p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        {hasSearched && !error && (
          <section className="mb-8" aria-live="polite">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-neo-display text-2xl font-bold text-white">
                {content.resultsTitle}
              </h2>
              {totalCount > 0 && (
                <span className="bg-neo-cyan text-neo-black font-bold px-3 py-1 border-3 border-neo-black rounded-neo text-sm">
                  {totalCount} {content.wordsFound}
                  {wasCapped && ` (${content.showingFirst} 500)`}
                </span>
              )}
            </div>

            {totalCount === 0 ? (
              <p className="text-neo-white text-lg bg-neo-navy-light border-3 border-neo-black rounded-neo p-6 text-center">
                {content.noResults}
              </p>
            ) : (
              <>
                <div className="space-y-4">
                  {grouped.map(([len, words]) => (
                    <div
                      key={len}
                      className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-4"
                    >
                      <h3 className="font-neo-display font-bold text-neo-orange mb-3">
                        {len}{content.letterWords} ({words.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {words.map((word) => (
                          <span
                            key={word}
                            className={cn(
                              'px-3 py-1.5 font-mono font-bold text-sm',
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
                <p className="text-neo-white text-sm mt-4 italic">
                  {content.fullDictionaryNote}
                </p>
              </>
            )}
          </section>
        )}

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

        <section
          className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-6 mb-8"
          data-speakable="true"
        >
          <h2 className="font-neo-display text-2xl font-bold text-white mb-4">
            {content.howToTitle}
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-neo-white">
            {content.howToSteps.map((step, i) => (
              <li key={`step-${i}-${step.slice(0, 24)}`} className="leading-relaxed">{step}</li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="font-neo-display text-2xl font-bold text-white mb-4">
            {content.tipsTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {content.tips.map((tip) => (
              <article
                key={tip.title}
                className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-4"
              >
                <h3 className="font-neo-display font-bold text-neo-cyan mb-2">
                  {tip.title}
                </h3>
                <p className="text-neo-white text-sm leading-relaxed">
                  {tip.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-8" data-speakable="true">
          <h2 className="font-neo-display text-2xl font-bold text-white mb-4">
            {content.faqTitle}
          </h2>
          <div className="space-y-4">
            {content.faqs.map((faq, i) => (
              <details
                key={`faq-${i}-${faq.question}`}
                className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-4 group"
              >
                <summary className="font-neo-display font-bold text-neo-orange cursor-pointer list-none flex items-center justify-between">
                  {faq.question}
                  <span className="text-neo-white group-open:rotate-180 transition-transform">
                    &#9660;
                  </span>
                </summary>
                <p className="text-neo-white mt-3 leading-relaxed">
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
