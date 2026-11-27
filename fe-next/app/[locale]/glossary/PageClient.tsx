'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeLocaleCompare } from '@/utils/bcp47Locale';
import { ArrowLeft } from 'lucide-react';
import { LandingHero, LandingPage } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { contentByLocale } from './content';

export default function GlossaryPageClient({ children }: { children?: React.ReactNode }): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const content = contentByLocale[locale] || contentByLocale.en;

  const sortedTerms = useMemo(() =>
    [...content.terms].sort((a, b) => safeLocaleCompare(a.term, b.term, locale)),
    [content.terms, locale]
  );

  const letters = useMemo(() => {
    const set = new Set(sortedTerms.map(t => t.term.charAt(0).toUpperCase()));
    return Array.from(set).sort((a, b) => safeLocaleCompare(a, b, locale));
  }, [sortedTerms, locale]);

  return (
    <div className="flex min-h-screen flex-col bg-neo-navy">
      <AutoHideHeader />

      <LandingPage locale={locale} topBar={false} className="gap-10 sm:gap-14">
        <div className="flex flex-col gap-6">
          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border-2 border-neo-white/25 px-4 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white"
          >
            <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
            Home
          </Link>
          <LandingHero title={content.title} lead={content.subtitle} art={LANDING_ART.reading('')} artTone="pink" />
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Alphabetical navigation">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="flex h-11 w-11 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream font-neo-display text-lg font-bold text-neo-black shadow-hard-sm hover:bg-neo-yellow"
            >
              {letter}
            </a>
          ))}
        </nav>

        <InlineBannerAd webZone="content-page" />

        <div data-speakable="true" className="flex flex-col gap-10">
          {letters.map((letter, li) => {
            const termsForLetter = sortedTerms.filter((t) => t.term.charAt(0).toUpperCase() === letter);
            return (
              <section key={letter} id={`letter-${letter}`} className="grid scroll-mt-24 gap-4 md:grid-cols-[4.5rem_1fr]">
                <h2 className="flex h-14 w-14 -rotate-3 items-center justify-center rounded-neo-lg border-3 border-neo-black bg-neo-yellow font-neo-display text-3xl font-bold text-neo-black shadow-hard-lg md:sticky md:top-24">
                  {letter}
                </h2>
                <dl className="grid gap-4 lg:grid-cols-2">
                  {termsForLetter.map((item) => (
                    <div key={item.term} className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-lg">
                      <dt className="mb-1 font-neo-display text-lg font-bold">{item.term}</dt>
                      <dd className="text-[15px] leading-relaxed">{item.definition}</dd>
                      {item.related && item.related.length > 0 && (
                        <dd className="mt-2 text-xs text-neo-black/65">Related: {item.related.join(', ')}</dd>
                      )}
                    </div>
                  ))}
                </dl>
                {li === 2 && <InlineBannerAd webZone="content-page" className="md:col-span-2" />}
              </section>
            );
          })}
        </div>

        <InlineBannerAd webZone="content-page" />
        {children}
      </LandingPage>
    </div>
  );
}
