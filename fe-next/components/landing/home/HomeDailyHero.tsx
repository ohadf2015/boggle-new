'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoSkeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useDailyChallengeStats, type PreloadedDailyStats } from '@/hooks/useDailyChallengeStats';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { dailyProgressCells, cycleProgressCells } from '@/lib/landing/homeHubFormat';
import { getLastSevenDaysCompletion } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';
import { DailyWheel } from './DailyWheel';
import wheelStyles from './DailyWheel.module.css';
import { useHomeLaunch } from './HomeLaunch';

interface HomeDailyHeroProps {
  preloadedStats?: PreloadedDailyStats;
}

/**
 * Today's Word Wheel: the home's primary action. The whole card is one target;
 * the lime bar at its foot is what it says it does.
 */
export function HomeDailyHero({ preloadedStats }: HomeDailyHeroProps) {
  const { t, language, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const launch = useHomeLaunch();
  const stats = useDailyChallengeStats(preloadedStats);
  // Day cells mirror the weekly chest's all-modes, freeze-aware cycle; guests fall back to local completion.
  const chest = useWeeklyChest();
  // Countdown and outcome are client-only; SSR and the first client render share the loading state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const countdown = mounted ? stats.countdown : '';
  const hasPlayed = mounted ? stats.hasPlayed : false;
  const hasSolved = mounted ? stats.hasSolved : false;
  // Pessimistic until the player's snapshot resolves, so Play never snaps to View results.
  const ctaLoading = !mounted || stats.loading;
  const streak = mounted ? (preloadedStats?.currentStreak ?? stats.streak) : 0;
  const puzzleNumber = stats.puzzleNumber;
  const cells = !mounted
    ? cycleProgressCells([], '', 7)
    : chest.cycleStart
      ? cycleProgressCells(chest.completedDates, chest.cycleStart, 7)
      : dailyProgressCells(getLastSevenDaysCompletion(language as Language), 7);
  const href = `/${language}/daily/word-wheel`;

  return (
    <Link
      href={href}
      prefetch={false}
      data-testid="home-daily-hero"
      onPointerEnter={() => launch?.prefetch(href)}
      onPointerDown={() => launch?.prefetch(href)}
      onClick={(e) => {
        trackLandingCtaClick('daily_banner', { mode: 'word-wheel', hasPlayed });
        launch?.start(e, { href, tone: 'yellow', title: t('sitemap.wordWheel', 'Word Wheel'), art: '/modes/cubes/daily.png' });
      }}
      aria-label={`${t('sitemap.wordWheel', 'Word Wheel')} #${puzzleNumber}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-neo-xl border-neo-thick border-black bg-neo-navy-light shadow-hard-lg',
        'transition-[transform,box-shadow] duration-100 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        'md:h-full',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 22% 40%, rgba(255,225,53,0.20), transparent 65%), linear-gradient(160deg, rgba(255,225,53,0.10), rgba(255,107,53,0.05) 55%, transparent)' }}
      />

      <div className="relative flex flex-1 items-center gap-3 px-3 pt-3 md:flex-col md:justify-center md:gap-6 md:px-8 md:pt-8">
        <DailyWheel className="w-[43%] max-w-[190px] shrink-0 md:w-[min(100%,19rem)] md:max-w-none" />

        <div className="min-w-0 flex-1 md:flex-none md:text-center">
          <span className="inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-black bg-neo-yellow px-2.5 py-[3px] font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-navy shadow-hard-sm md:text-xs">
            <span className="relative flex h-[7px] w-[7px]">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-neo-navy" />
            </span>
            {t('sitemap.wordWheel', 'Word Wheel')}
          </span>

          <h2 className="mt-2 font-neo-display text-[1.6rem] font-black uppercase leading-[0.95] tracking-tight text-neo-cream md:text-5xl">
            {t('landing.home.todaysPuzzle')}
          </h2>
          <div className="mt-1.5 font-neo-body text-xs font-medium text-neo-white/60 tabular-nums md:text-base" suppressHydrationWarning>
            {t('landing.home.puzzleNo', { n: puzzleNumber })} · {t('landing.home.resetsIn', { time: countdown })}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1 md:mt-4 md:justify-center md:gap-1.5">
            {cells.map((filled, i) => (
              <span
                key={i}
                className={cn(
                  'h-[14px] w-[14px] rounded-[3px] border-[1.5px] border-black md:h-5 md:w-5',
                  filled ? 'bg-neo-yellow' : 'bg-neo-navy/60',
                )}
              />
            ))}
            {streak > 0 && (
              <span className="ms-1.5 inline-flex items-center gap-1 font-neo-display text-[11px] font-semibold text-neo-yellow md:text-sm">
                <Flame className="h-3 w-3 text-neo-orange md:h-4 md:w-4" strokeWidth={2.4} aria-hidden="true" />
                {t('landing.home.dayStreak', { n: streak })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative p-3 md:p-8 md:pt-6">
        {ctaLoading ? (
          <span data-testid="daily-cta-skeleton" aria-hidden="true" className="block">
            <NeoSkeleton variant="default" height={52} className="rounded-neo border-[3px] border-black md:!h-16" />
          </span>
        ) : (
          <span
            data-testid="daily-cta"
            className={cn(
              wheelStyles.cta,
              'flex h-[52px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-black font-neo-display text-lg font-black uppercase tracking-wide shadow-hard',
              'transition-[transform,box-shadow] duration-100 group-hover:-translate-y-0.5 group-active:translate-y-[3px] group-active:shadow-none md:h-16 md:text-2xl',
              hasPlayed ? 'bg-neo-navy text-neo-cream' : 'bg-neo-lime text-neo-navy',
            )}
          >
            {hasPlayed ? (
              <>
                {t('daily.viewResults')}
                {hasSolved && <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />}
              </>
            ) : (
              <>
                {t('daily.play')}
                <Arrow className={cn('h-5 w-5', wheelStyles.nudge)} strokeWidth={3} aria-hidden="true" />
              </>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

export default HomeDailyHero;
