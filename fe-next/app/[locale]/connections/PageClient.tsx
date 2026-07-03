'use client';

import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import ConnectionsGame from '@/components/connections/ConnectionsGame';
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
    // Locale not supported for landing — render game directly so direct visitors aren't stranded.
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Suspense fallback={<LoadingFallback />}>
          <ConnectionsGame />
        </Suspense>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <TopBackLink className="mb-4" />
      <ConnectionsHero locale={locale} copy={copy} />

      {/* Competitive hooks surfaced right on the landing */}
      <div className="mx-auto mb-6 flex max-w-md flex-wrap justify-center gap-3 px-4">
        <Link
          href={`/${locale}/connections/daily`}
          className="flex items-center gap-2 rounded-neo border-neo-thick border-neo-yellow bg-neo-yellow/15 px-4 py-2 font-neo-display text-sm font-black text-neo-yellow shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          🏆 {t('connections.daily.cta', locale === 'he' ? 'אתגר יומי' : 'Daily Challenge')}
        </Link>
        <Link
          href={`/${locale}/connections/community`}
          className="flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink/15 px-4 py-2 font-neo-display text-sm font-black text-neo-pink shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          👥 {t('connections.community.cta', locale === 'he' ? 'קהילה' : 'Community')}
        </Link>
        {getPyramidsForLocale(locale).length > 0 && (
          <Link
            href={`/${locale}/connections/pyramid`}
            className="flex items-center gap-2 rounded-neo border-neo-thick border-neo-purple bg-neo-purple/15 px-4 py-2 font-neo-display text-sm font-black text-neo-purple shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            🔺 {t('connections.pyramid.cta', locale === 'he' ? 'פירמידה' : 'Pyramid')}
          </Link>
        )}
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
