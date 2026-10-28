'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { BLAST_RESULT_ASSETS, TIER_THEME } from './blastResultsTheme';
import type { BlastResultsView } from './blastResultsViewModel';
import type { BlastTranslate } from './types';

interface BlastResultsHeroProps {
  view: BlastResultsView;
  t: BlastTranslate;
  locale: string;
  headline?: string;
  subline?: ReactNode;
  footer?: ReactNode;
  stars?: { count: 1 | 2 | 3; label: string } | null;
}

export function BlastResultsHero({ view, t, locale, headline, subline, footer, stars }: BlastResultsHeroProps) {
  const theme = TIER_THEME[view.tier];
  const showMedal = view.tier === 'high' || view.tier === 'newBest';

  return (
    <div className="relative w-full flex flex-col items-center" data-testid="blast-results-hero" data-tier={view.tier}>
      {view.celebrate.confetti && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BLAST_RESULT_ASSETS.confetti}
          alt=""
          aria-hidden="true"
          data-testid="blast-results-confetti"
          data-reveal="mascot"
          className="pointer-events-none absolute -top-4 inset-x-0 mx-auto w-72 max-w-none opacity-60"
        />
      )}

      <div className="relative z-10 h-28 w-28 sm:h-32 sm:w-32" data-reveal="mascot">
        <div aria-hidden="true" className={cn('absolute inset-3 rounded-full', theme.glow)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme.mascot}
          alt=""
          aria-hidden="true"
          data-testid="blast-results-mascot"
          data-tier={view.tier}
          className="relative h-full w-full object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))]"
        />
      </div>

      <h2
        data-reveal="headline"
        className={cn(
          'relative z-10 mt-1 text-center font-neo-display text-3xl font-black uppercase tracking-wide [text-shadow:3px_3px_0_rgb(var(--neo-black))]',
          theme.headline,
        )}
      >
        {headline ?? t(theme.headlineKey)}
      </h2>

      {stars && (
        <div className="relative z-10 mt-1 flex flex-col items-center gap-0.5" data-testid="blast-results-stars">
          <div className="flex gap-1" dir="ltr">
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                data-reveal="star"
                className={cn(
                  'h-7 w-7 drop-shadow-[2px_2px_0_rgb(var(--neo-black))]',
                  n <= stars.count ? 'fill-neo-yellow text-neo-yellow' : 'text-neo-white/40',
                )}
                strokeWidth={2.5}
              />
            ))}
          </div>
          <span className="rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-neo-yellow">{stars.label}</span>
        </div>
      )}

      <div
        data-reveal="hero-card"
        data-testid="blast-results-score-card"
        className={cn(
          'relative z-10 mt-3 w-full rounded-neo border-3 bg-neo-navy-light px-4 pb-4 pt-5 text-center shadow-hard-lg',
          theme.frame,
        )}
      >
        {showMedal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BLAST_RESULT_ASSETS.medal}
            alt=""
            aria-hidden="true"
            data-reveal="medal"
            className="absolute -top-7 end-3 h-16 w-16 object-contain"
          />
        )}

        {view.isNewBest && (
          <div
            data-reveal="banner"
            data-testid="blast-results-new-best"
            className="absolute -top-4 start-3 -rotate-6 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wider text-neo-black shadow-hard"
          >
            {t('blast.results.newRecord')}
          </div>
        )}

        <p
          data-reveal="score"
          className="font-neo-display text-6xl font-black tabular-nums text-neo-white [text-shadow:3px_3px_0_rgb(var(--neo-black))]"
          dir="ltr"
        >
          {safeToLocaleString(view.score, locale)}
        </p>

        {subline && (
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-neo-white">{subline}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {view.pbDelta != null && (
            <span className="inline-flex items-center gap-1 text-sm font-black text-neo-lime">
              <TrendingUp className="h-4 w-4" strokeWidth={2.75} />
              {t('blast.results.pbDelta', { delta: safeToLocaleString(view.pbDelta, locale) })}
            </span>
          )}
          {view.rank && <RankChip rank={view.rank} t={t} />}
        </div>

        {footer}
      </div>
    </div>
  );
}

function RankChip({ rank, t }: { rank: NonNullable<BlastResultsView['rank']>; t: BlastTranslate }) {
  const up = rank.delta != null && rank.delta > 0;
  const down = rank.delta != null && rank.delta < 0;
  return (
    <span
      data-testid="blast-results-rank"
      className="inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-0.5 text-xs font-black uppercase text-neo-white shadow-hard-sm"
    >
      {t('blast.results.reveal.rank')}
      <bdi className="tabular-nums text-neo-cyan">
        #{rank.current}
        {rank.total ? ` / ${rank.total}` : ''}
      </bdi>
      {up && (
        <span className="inline-flex items-center text-neo-lime">
          <ArrowUp className="h-3 w-3" strokeWidth={3} />
          {t('blast.results.reveal.rankUp', { n: rank.delta! })}
        </span>
      )}
      {down && (
        <span className="inline-flex items-center text-neo-pink">
          <ArrowDown className="h-3 w-3" strokeWidth={3} />
          {t('blast.results.reveal.rankDown', { n: Math.abs(rank.delta!) })}
        </span>
      )}
    </span>
  );
}
