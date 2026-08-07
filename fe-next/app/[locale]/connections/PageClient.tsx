'use client';

import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { Pyramid, Trophy, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import ConnectionsGame from '@/components/connections/ConnectionsGame';
import PyramidChallenge from '@/components/connections/pyramid/PyramidChallenge';
import ConnectionsHero from '@/components/connections/landing/ConnectionsHero';
import ConnectionsSampleStrip from '@/components/connections/landing/ConnectionsSampleStrip';
import ConnectionsWhyPlay from '@/components/connections/landing/ConnectionsWhyPlay';
import ConnectionsHEClassic from '@/components/connections/landing/ConnectionsHEClassic';
import ConnectionsCompare from '@/components/connections/landing/ConnectionsCompare';
import ConnectionsFAQ from '@/components/connections/landing/ConnectionsFAQ';
import ConnectionsFooterCTA from '@/components/connections/landing/ConnectionsFooterCTA';
import ConnectionsStickyCTA from '@/components/connections/landing/ConnectionsStickyCTA';
import { trackLandingView } from '@/lib/connections/landingTelemetry';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import type { ConnectionsLandingCopy } from './content';

function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex items-center justify-center">
      <PageLoader size="lg" text={t('connections.loading')} />
    </div>
  );
}

interface Props {
  locale: string;
  copy: ConnectionsLandingCopy;
  renderLanding: boolean;
}

export default function ConnectionsPageClient({ locale, copy, renderLanding }: Props): React.JSX.Element {
  const { t } = useLanguage();

  useEffect(() => {
    if (renderLanding) {
      trackLandingView(locale);
    }
  }, [locale, renderLanding]);

  if (locale === 'ja') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-neo-navy p-8 text-center text-neo-white">
        <p className="max-w-md text-lg text-neo-white">{t('connections.noAccess')}</p>
      </div>
    );
  }

  if (!renderLanding) {
    // Locale not supported for landing — render game directly so direct visitors
    // aren't stranded. Pyramid is the default mode when the locale has a pool.
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Suspense fallback={<LoadingFallback />}>
          {getPyramidsForLocale(locale).length > 0 ? <PyramidChallenge /> : <ConnectionsGame />}
        </Suspense>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <TopBackLink className="mb-4" />
      <ConnectionsHero locale={locale} copy={copy} />

      {/* Competitive hooks surfaced right on the landing — pyramid is the flagship */}
      <div className="mx-auto mb-6 flex max-w-md flex-wrap justify-center gap-3 px-4">
        {/* "Pyramid" alone tells a first-time visitor nothing — the tagline is
            what sells the flagship mode. */}
        {getPyramidsForLocale(locale).length > 0 && (
          <Link
            href={`/${locale}/connections/pyramid`}
            data-testid="landing-pyramid-cta"
            className="flex w-full items-center gap-3 rounded-neo border-neo-thick border-neo-purple bg-neo-purple px-4 py-3 shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Pyramid className="h-6 w-6 shrink-0 text-neo-white" strokeWidth={2.5} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col text-start">
              <span className="font-neo-display text-base font-black text-neo-white">
                {t('connections.pyramid.cta', locale === 'he' ? 'פירמידה' : 'Pyramid')}
              </span>
              <span className="font-neo-body text-xs text-neo-white/85">
                {t(
                  'connections.pyramid.tagline',
                  locale === 'he' ? '3 חידות. מילה אחת מחברת ביניהן.' : '3 riddles. 1 word connects them all.',
                )}
              </span>
            </span>
          </Link>
        )}
        <Link
          href={`/${locale}/connections/daily`}
          className="flex items-center gap-2 rounded-neo border-neo-thick border-neo-yellow bg-neo-yellow/15 px-4 py-2 font-neo-display text-sm font-black text-neo-yellow shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Trophy className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {t('connections.daily.cta', locale === 'he' ? 'אתגר יומי' : 'Daily Challenge')}
        </Link>
        <Link
          href={`/${locale}/connections/community`}
          className="flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink/15 px-4 py-2 font-neo-display text-sm font-black text-neo-pink shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Users className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {t('connections.community.cta', locale === 'he' ? 'קהילה' : 'Community')}
        </Link>
      </div>
      <ConnectionsSampleStrip locale={locale} copy={copy.samples} />
      <ConnectionsWhyPlay copy={copy.why} />
      {locale === 'he' && copy.heClassic && <ConnectionsHEClassic copy={copy.heClassic} />}
      <ConnectionsCompare copy={copy.compare} />
      <ConnectionsFAQ locale={locale} copy={copy.faq} />
      <ConnectionsFooterCTA locale={locale} copy={copy.footerCta} />

      <ConnectionsStickyCTA
        locale={locale}
        label={copy.footerCta.button}
        copy={copy}
      />
    </main>
  );
}
