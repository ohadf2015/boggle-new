'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BragKind } from '@/lib/results/bragOgModel';

/**
 * Shows the shared result and puts the rematch one tap away.
 *
 * The result is rendered by displaying the OG image itself rather than
 * re-implementing the card in DOM: the image is already the artifact, and one
 * source of truth means the page and the chat preview can never disagree.
 */
export default function BragPageClient({
  locale,
  code,
  imageQuery,
  hasRival,
  kind = 'result',
}: {
  locale: string;
  code: string;
  imageQuery: string;
  hasRival: boolean;
  kind?: BragKind;
}) {
  const { t } = useLanguage();
  const utm = 'utm_source=brag_page&utm_medium=referral&utm_campaign=player_invite';
  const isMoment = kind !== 'result';
  const noRoom = isMoment || code === 'solo';
  const ctaHref = noRoom ? `/${locale}?${utm}` : `/${locale}?room=${encodeURIComponent(code)}&${utm}`;
  const heading = isMoment
    ? t(`brag2.page.title.${kind}`)
    : hasRival ? t('brag.page.titleVs', 'Think you can beat this?') : t('brag.page.titleSolo', 'Think you can beat this score?');

  return (
    <main className="min-h-screen bg-neo-navy flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-[820px] flex flex-col gap-6">
        {/* The artifact. Fixed aspect so there is no reflow while it loads. */}
        <div className="w-full border-neo-thick border-black rounded-neo overflow-hidden shadow-hard-lg bg-neo-navy-light">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic OG
              route, not a static asset; next/image would proxy-optimise a PNG
              that is already sized exactly 1200x630. */}
          <img
            src={`/api/og/brag?${imageQuery}`}
            alt={t('brag.page.imageAlt', 'Shared LexiClash result')}
            width={1200}
            height={630}
            className="w-full h-auto block"
          />
        </div>

        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-neo-display font-bold text-2xl sm:text-3xl text-neo-white">
            {heading}
          </h1>
          <p className="font-neo-body text-neo-white/70 text-sm sm:text-base">
            {t('brag.page.sub', 'No signup, no download. Jump straight into the next round.')}
          </p>
        </div>

        <Link
          href={ctaHref}
          className="w-full flex items-center justify-center py-4 px-6 border-neo-thick border-black bg-neo-lime text-neo-navy font-neo-display font-bold text-lg rounded-neo shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed transition-[box-shadow]"
        >
          {noRoom ? t('brag2.page.ctaPlay') : t('brag.page.cta', 'Take the rematch')}
        </Link>

        {!noRoom && (
          <Link
            href={`/${locale}`}
            className="text-center font-neo-body text-sm text-neo-white/60 underline hover:text-neo-white transition-colors"
          >
            {t('brag.page.explore', 'Or explore LexiClash')}
          </Link>
        )}
      </div>
    </main>
  );
}
