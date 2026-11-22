'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Shield } from 'lucide-react';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { formatTimeHHMMSS } from '@/shared/utils/timeFormatting';
import { useTodayLabel } from './useTodayLabel';

interface HeroQuickLinksProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  streak: number;
  streakLoading: boolean;
  atRisk?: boolean;
  /** Banked streak freezes (signed-in only); shown on the chip when > 0. */
  freezes?: number;
  playedToday?: boolean;
}

function NextPuzzleIn({ t }: Pick<HeroQuickLinksProps, 't'>) {
  const [left, setLeft] = useState(getSecondsUntilNextDaily);
  useEffect(() => {
    const id = setInterval(() => setLeft(getSecondsUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span data-sub data-testid="hp-daily-next" className="mt-1 truncate text-xs font-bold tracking-wide tabular-nums opacity-90 lg:text-base">
      {t('homePlay.dailyNextIn', { time: formatTimeHHMMSS(left) })}
    </span>
  );
}

export function HeroQuickLinks({ lang, t, streak, streakLoading, atRisk = false, freezes = 0, playedToday = false }: HeroQuickLinksProps) {
  const date = useTodayLabel(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const known = !streakLoading && streak > 0;
  const done = !streakLoading && playedToday;
  const dailySub = known ? (atRisk ? t('dailyStreak.flame.atRisk', { n: streak }) : t('homePlay.chipStreak', { n: streak })) : date;
  return (
    <ul className="grid grid-cols-1" data-testid="hp-quick-links">
      <li className="min-w-0">
        <Link
          // One tap into today's puzzle (the Word Wheel), not the hub in between.
          href={`/${lang}/daily`}
          data-testid="hp-chip-daily"
          onClick={() => trackLandingCtaClick('home_daily_chip')}
          className="relative flex h-[60px] items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-orange ps-2 pe-3 text-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed [@media(max-height:700px)]:h-[54px] lg:h-[80px] lg:gap-4 lg:rounded-3xl lg:ps-3 lg:pe-5 lg:shadow-hard"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-neo-yellow lg:h-14 lg:w-14 lg:rounded-2xl">
            <StreakFlame days={known ? streak : 0} size={30} mood={known && atRisk ? 'worried' : 'happy'} animated={known} />
          </span>
          <span className="relative flex min-w-0 flex-col items-start leading-none">
            <span className="truncate font-neo-display text-[19px] font-bold lg:text-3xl">{t('homePlay.chipDaily')}</span>
            {done ? <NextPuzzleIn t={t} /> : <span data-sub className="mt-1 truncate text-xs font-bold tracking-wide opacity-90 lg:text-base">{dailySub}</span>}
          </span>
          <span className="relative ms-auto flex shrink-0 items-center gap-2">
            {freezes > 0 && (
              <span
                className="flex items-center gap-1 rounded-full border-2 border-black bg-neo-cyan px-2 py-0.5 text-[11px] font-bold text-black lg:text-sm"
                data-testid="hp-chip-freezes"
                title={t('quickLoop.freezes.title')}
                aria-label={t('quickLoop.freezes.aria', { n: freezes })}
              >
                <Shield className="h-3 w-3 lg:h-4 lg:w-4" strokeWidth={3} aria-hidden="true" />
                {freezes}
              </span>
            )}
            {done ? (
              <span className="flex items-center gap-1 rounded-xl border-2 border-black bg-neo-lime px-2.5 py-1.5 font-neo-display text-sm font-bold text-black lg:px-4 lg:py-2 lg:text-lg">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                {t('homePlay.dailyDone')}
              </span>
            ) : (
              <span className="rounded-xl border-2 border-black bg-neo-navy px-3 py-1.5 font-neo-display text-sm font-bold text-neo-cream shadow-hard-sm lg:px-4 lg:py-2 lg:text-lg">
                {t('quickLoop.daily.play')}
              </span>
            )}
          </span>
        </Link>
      </li>
    </ul>
  );
}
