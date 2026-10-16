'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useDailyChallengeStats, type PreloadedDailyStats } from '@/hooks/useDailyChallengeStats';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { dailyProgressCells, cycleProgressCells } from '@/lib/landing/homeHubFormat';
import { getLastSevenDaysCompletion } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';
import { DailyWheel } from './DailyWheel';
import wheelStyles from './DailyWheel.module.css';
import { useHomeLaunch } from './HomeLaunch';

const CTA_BAR = cn(
  wheelStyles.cta,
  'flex h-[52px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-black font-neo-display text-lg font-black uppercase tracking-wide shadow-hard',
  'transition-[transform,box-shadow] duration-100 group-hover:-translate-y-0.5 group-active:translate-y-[3px] group-active:shadow-none md:h-[4.5rem] md:text-3xl',
);

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
  // The card links to today's Word Wheel, so its PLAY / VIEW RESULTS follows
  // Word Wheel's played state. `stats.hasPlayed` is WORD HUNT's: reading it
  // here offered PLAY on a finished wheel and VIEW RESULTS on an unplayed one.
  const played = useDailyPlayedStatus();
  // Day cells mirror the weekly chest's all-modes, freeze-aware cycle; guests fall back to local completion.
  const chest = useWeeklyChest();
  // Countdown and outcome are client-only; SSR and the first client render share the loading state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const countdown = mounted ? stats.countdown : '';
  const hasPlayed = mounted ? played.today.wordWheel : false;
  // Once any daily is done the hub is the next stop — it shows what is left
  // today, the streak and the weekly chest. The wheel's results screen doesn't.
  const anyPlayed = mounted && Object.values(played.today).some(Boolean);
  // Pessimistic until the player's snapshot resolves, so Play never snaps to View results.
  const ctaLoading = !mounted || stats.loading || played.loading;
  const streak = mounted ? (preloadedStats?.currentStreak ?? stats.streak) : 0;
  const puzzleNumber = stats.puzzleNumber;
  const cells = !mounted
    ? cycleProgressCells([], '', 7)
    : chest.cycleStart
      ? cycleProgressCells(chest.completedDates, chest.cycleStart, 7)
      : dailyProgressCells(getLastSevenDaysCompletion(language as Language), 7);
  const href = anyPlayed ? `/${language}/daily` : `/${language}/daily/word-wheel`;

  return (
    <Link
      href={href}
      prefetch={false}
      data-testid="home-daily-hero"
      onPointerEnter={() => launch?.prefetch(href)}
      onPointerDown={() => launch?.prefetch(href)}
      onClick={(e) => {
        trackLandingCtaClick('daily_banner', { mode: anyPlayed ? 'hub' : 'word-wheel', hasPlayed });
        launch?.start(e, { href, tone: 'yellow', title: anyPlayed ? t('daily.title') : t('sitemap.wordWheel', 'Word Wheel'), art: '/modes/cubes/daily.png' });
      }}
      aria-label={`${t('sitemap.wordWheel', 'Word Wheel')} #${puzzleNumber}`}
      className={cn(
        'group relative overflow-hidden rounded-neo-xl border-neo-thick border-neo-yellow bg-neo-navy-light shadow-hard-lg',
        'transition-[transform,box-shadow] duration-100 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        wheelStyles.hero,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 22% 40%, rgba(255,225,53,0.20), transparent 65%), linear-gradient(160deg, rgba(255,225,53,0.10), rgba(255,107,53,0.05) 55%, transparent)' }}
      />

      <DailyWheel className={cn('relative', wheelStyles.heroWheel)} />

      <div className={cn('relative min-w-0', wheelStyles.heroText)}>
        <span className="inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-black bg-neo-yellow px-2.5 py-[3px] font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-navy shadow-hard-sm md:px-3 md:py-1 md:text-sm">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-neo-navy" />
          </span>
          {t('sitemap.wordWheel', 'Word Wheel')}
        </span>

        <h2 className="mt-2 font-neo-display text-[1.85rem] font-black uppercase leading-[0.95] tracking-tight text-balance text-neo-cream md:mt-4 md:text-6xl lg:text-7xl">
          {t('landing.home.todaysPuzzle')}
        </h2>
        <div className="mt-1.5 font-neo-body text-xs font-medium text-neo-white/60 tabular-nums md:mt-3 md:text-lg" suppressHydrationWarning>
          {t('landing.home.puzzleNo', { n: puzzleNumber })} · {t('landing.home.resetsIn', { time: countdown })}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1 md:mt-5 md:gap-2">
          {cells.map((filled, i) => (
            <span
              key={i}
              className={cn(
                'h-[15px] w-[15px] rounded-[3px] border-[1.5px] md:h-7 md:w-7 md:rounded-[5px] md:border-2',
                filled ? 'border-black bg-neo-yellow' : 'border-neo-cream/40 bg-neo-navy/60',
              )}
            />
          ))}
          {streak > 0 && (
            <span className="ms-1.5 inline-flex items-center gap-1 font-neo-display text-[11px] font-semibold text-neo-yellow md:text-base">
              <Flame className="h-3 w-3 text-neo-orange md:h-5 md:w-5" strokeWidth={2.4} aria-hidden="true" />
              {t('landing.home.dayStreak', { n: streak })}
            </span>
          )}
        </div>
      </div>

      <div className={cn('relative', wheelStyles.heroCta)}>
        {ctaLoading ? (
          <span
            data-testid="daily-cta-skeleton"
            aria-hidden="true"
            className={cn(CTA_BAR, 'bg-neo-lime text-neo-navy')}
          >
            <Arrow className={cn('h-6 w-6', wheelStyles.nudge)} strokeWidth={3} />
          </span>
        ) : (
          <span
            data-testid="daily-cta"
            className={cn(CTA_BAR, anyPlayed ? 'border-neo-cream/40 bg-neo-navy text-neo-cream' : 'bg-neo-lime text-neo-navy')}
          >
            {anyPlayed ? (
              <>
                {t('daily.openHub')}
                {hasPlayed ? (
                  <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <Arrow className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                )}
              </>
            ) : (
              <>
                {t('daily.play')}
                <Arrow className={cn('h-5 w-5 md:h-7 md:w-7', wheelStyles.nudge)} strokeWidth={3} aria-hidden="true" />
              </>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

export default HomeDailyHero;
