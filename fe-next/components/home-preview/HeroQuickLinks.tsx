'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useTodayLabel } from './useTodayLabel';

interface HeroQuickLinksProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  streak: number;
  streakLoading: boolean;
  atRisk?: boolean;
  /** Banked streak freezes (signed-in only); shown on the chip when > 0. */
  freezes?: number;
  shine?: boolean;
}

export function HeroQuickLinks({ lang, t, streak, streakLoading, atRisk = false, freezes = 0, shine = false }: HeroQuickLinksProps) {
  const date = useTodayLabel(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const known = !streakLoading && streak > 0;
  const dailySub = known ? (atRisk ? t('dailyStreak.flame.atRisk', { n: streak }) : t('homePlay.chipStreak', { n: streak })) : date;
  return (
    <ul className="grid grid-cols-1" data-testid="hp-quick-links">
      <li className="min-w-0">
        <Link
          // One tap into today's puzzle (the Word Wheel), not the hub in between.
          href={`/${lang}/daily`}
          data-testid="hp-chip-daily"
          onClick={() => trackLandingCtaClick('home_daily_chip')}
          className="group relative flex h-[64px] items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-orange ps-2 pe-3 text-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed [@media(max-height:700px)]:h-[56px] lg:h-[88px] lg:gap-4 lg:rounded-3xl lg:ps-3 lg:pe-5 lg:shadow-hard-lg"
        >
          {shine && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/40 animate-[qp-shine_4s_ease-in-out_1.6s_infinite_both]"
            />
          )}
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-neo-yellow lg:h-16 lg:w-16 lg:rounded-2xl">
            <StreakFlame days={known ? streak : 0} size={34} mood={known && atRisk ? 'worried' : 'happy'} animated={known} />
          </span>
          <span className="relative flex min-w-0 flex-col items-start leading-none">
            <span className="truncate font-neo-display text-[21px] font-bold lg:text-3xl">{t('homePlay.chipDaily')}</span>
            <span data-sub className="mt-1 truncate text-xs font-bold tracking-wide opacity-90 lg:text-base">{dailySub}</span>
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
            <span className="rounded-xl border-2 border-black bg-neo-navy px-3 py-1.5 font-neo-display text-sm font-bold text-neo-cream shadow-hard-sm lg:px-4 lg:py-2 lg:text-lg">
              {t('quickLoop.daily.play')}
            </span>
          </span>
        </Link>
      </li>
    </ul>
  );
}
