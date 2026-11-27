'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { InlineBannerAd } from '@/components/ads';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { CtaBand, FaqList, LandingButton, LandingPage, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { getContent } from './content';
import { findWordsApi, groupByLength } from './wordList';
import { CLEAR_BUTTON, ERROR_BOX, PAPER, SOLVE_BUTTON, TEXT_INPUT, WORD_CHIP } from './solverStyles';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'he', label: 'עברית', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'sv', label: 'Svenska', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'ja', label: '日本語', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'es', label: 'Español', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'ru', label: 'Русский', flag: '\u{1F1F7}\u{1F1FA}' },
] as const;

export default function WordSolverPageClient({ children }: { children?: React.ReactNode }) {
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
  const art = LANDING_ART.solver('');

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale={locale} topBar={false}>
        <header className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-x-12 lg:pt-6">
          <div className="flex flex-col gap-4">
            <h1
              className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl"
              data-speakable="true"
            >
              {content.title}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-neo-white/85">{content.subtitle}</p>
            <div className="hidden -rotate-2 self-start rounded-neo-lg border-3 border-neo-black bg-neo-purple p-6 shadow-hard-xl lg:mt-4 lg:block">
              <Image src={art.src} alt={art.alt} width={art.width} height={art.height} sizes="224px" className="h-64 w-auto" />
            </div>
          </div>

          <section className={cn(PAPER, 'flex flex-col gap-5 p-5 sm:p-7')} aria-label={content.inputLabel}>
            <div>
              <label htmlFor="solver-language" className="mb-2 block text-sm font-bold">
                {content.languageLabel}
              </label>
              <div className="flex flex-wrap gap-2" id="solver-language">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSolverLang(lang.code)}
                    aria-pressed={solverLang === lang.code}
                    className={cn(
                      'min-h-10 rounded-full border-2 border-neo-black px-3 py-1.5 font-neo-display text-sm font-bold',
                      'transition-[background-color,box-shadow] duration-100',
                      solverLang === lang.code
                        ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                        : 'bg-neo-white text-neo-black hover:bg-neo-yellow'
                    )}
                  >
                    <span className="me-1">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="letter-input" className="mb-2 block font-neo-display text-xl font-bold">
                {content.inputLabel}
              </label>
              <div className="flex flex-col gap-3">
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
                  className={TEXT_INPUT}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSolve}
                    disabled={letters.length < 2 || isLoading}
                    className={SOLVE_BUTTON}
                  >
                    {isLoading ? content.searchingText : content.solveButton}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className={CLEAR_BUTTON}
                  >
                    {content.clearButton}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </header>

        <InlineBannerAd webZone="content-page" />

        {/* Fixed height from the tap onward: the region never grows or collapses after the
            answer lands, which would count as layout shift outside the input window. */}
        {(isLoading || hasSearched || error) && (
          <section className="h-[50dvh] overflow-y-auto" aria-live="polite" data-testid="solver-results">
            {error && (
              <div className={cn(ERROR_BOX, 'mb-6')}>
                {error}
              </div>
            )}
            {hasSearched && !error && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-neo-display text-2xl font-bold">{content.resultsTitle}</h2>
                  {totalCount > 0 && (
                    <span className="rounded-full border-3 border-neo-black bg-neo-cyan px-3 py-1 text-sm font-bold text-neo-black">
                      {totalCount} {content.wordsFound}
                      {wasCapped && ` (${content.showingFirst} 500)`}
                    </span>
                  )}
                </div>

                {totalCount === 0 ? (
                  <p className={cn(PAPER, 'p-6 text-center text-lg')}>{content.noResults}</p>
                ) : (
                  <>
                    <div className="space-y-4">
                      {grouped.map(([len, words]) => (
                        <div key={len} className={cn(PAPER, 'p-4 shadow-hard-lg')}>
                          <h3 className="mb-3 font-neo-display font-bold">
                            {len}{content.letterWords} ({words.length})
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
                    <p className="mt-4 text-sm italic text-neo-white/75">{content.fullDictionaryNote}</p>
                  </>
                )}
              </>
            )}
          </section>
        )}

        <Section title={content.howToTitle}>
          <Prose paper>
            <ol data-speakable="true">
              {content.howToSteps.map((step, i) => (
                <li key={`step-${i}-${step.slice(0, 24)}`}>{step}</li>
              ))}
            </ol>
          </Prose>
        </Section>

        <Section title={content.tipsTitle}>
          <TileGrid variant="paper" columns={2} items={content.tips.map((tip) => ({ title: tip.title, body: tip.body }))} />
        </Section>

        <Section title={content.faqTitle}>
          <div data-speakable="true">
            <FaqList items={content.faqs.map((faq) => ({ q: faq.question, a: faq.answer }))} />
          </div>
        </Section>

        {children}

        <CtaBand
          tone="yellow"
          title={<span data-speakable="true">{content.ctaTitle}</span>}
          body={content.ctaDescription}
          actions={<LandingButton href={`/${locale}/quick-play`} variant="dark">{content.ctaButton}</LandingButton>}
          art={LANDING_ART.trophy('')}
        />
      </LandingPage>
    </div>
  );
}
