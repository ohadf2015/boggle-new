'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoSkeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useDailyChallengeStats, type PreloadedDailyStats } from '@/hooks/useDailyChallengeStats';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { CUBE_BLUR_DATA_URL } from '@/lib/landing/modeMeta';
import { dailyProgressCells, cycleProgressCells } from '@/lib/landing/homeHubFormat';
import { getLastSevenDaysCompletion } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';

const DAILY_ART = '/modes/cubes/daily.png';

interface HomeDailyHeroProps {
  preloadedStats?: PreloadedDailyStats;
}

/**
 * HomeDailyHero — the promoted Daily Challenge banner for the mobile Home Hub.
 * Richer than the inline `DailyChallengeCube`: a cyan "Daily Challenge" pill with
 * a live ping, a bold headline, puzzle # + countdown, a 5-cell streak strip, and
 * a lime Play CTA. Floats the daily mascot on the end (reduced-motion aware).
 * Reuses the same `useDailyChallengeStats` feed + `/daily` route as the cube.
 */
export function HomeDailyHero({ preloadedStats }: HomeDailyHeroProps) {
  const { t, language, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const stats = useDailyChallengeStats(preloadedStats);
  // The progress boxes mirror the WEEKLY CHEST's day markers — same server-side,
  // all-modes (Hunt/Wheel/Puzzle) + freeze-aware cycle — so the card can't show a
  // day as done/undone differently from the chest. Guests/offline (no cycle) fall
  // back to the local last-7-days completion so they still see their own progress.
  const chest = useWeeklyChest();
  // `useDailyChallengeStats` derives the puzzle number/countdown from the date on
  // the client, so SSR (preloaded "loading" 0) ≠ first client render (real #173)
  // → hydration mismatch (incl. the `aria-label`). Gate the date-derived values
  // behind mount: SSR + first client render both paint the loading zero-state,
  // real values commit after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const countdown = mounted ? stats.countdown : '';
  const hasPlayed = mounted ? stats.hasPlayed : false;
  const hasSolved = mounted ? stats.hasSolved : false;
  // The CTA (Play ↔ View results) hinges entirely on `hasPlayed`, which for an
  // authed player only becomes known once their daily snapshot resolves. Until
  // then — and pre-mount — render a skeleton pill instead of the optimistic
  // "Play" default, so the button never snaps from Play → View results after the
  // fetch lands (pitfall Class 1: render the pessimistic state until it resolves).
  const ctaLoading = !mounted || stats.loading;
  // Prefer the chest-authoritative streak threaded through `preloadedStats`
  // (all daily modes + freezes) so the fire icon matches the weekly chest; fall
  // back to the hook's localStorage value when no preloaded streak is supplied.
  const streak = mounted ? (preloadedStats?.currentStreak ?? stats.streak) : 0;
  const puzzleNumber = mounted ? stats.puzzleNumber : 0;
  // Progress strip = the chest's current 7-day cycle, each cell filled when that
  // day's daily was completed (any mode) per the server — identical to the chest's
  // dots. Falls back to local completion for guests / before the chest resolves.
  // Gated behind mount to keep SSR/first client render in sync (no hydration flash).
  const cells = !mounted
    ? cycleProgressCells([], '', 7)
    : chest.cycleStart
      ? cycleProgressCells(chest.completedDates, chest.cycleStart, 7)
      : dailyProgressCells(getLastSevenDaysCompletion(language as Language), 7);

  return (
    <Link
      href={`/${language}/daily`}
      prefetch={false}
      data-testid="home-daily-hero"
      onClick={() => trackLandingCtaClick('daily_banner', { mode: 'daily', hasPlayed })}
      aria-label={`${t('daily.title')} #${puzzleNumber}`}
      className={cn(
        'group relative block min-h-[138px] overflow-hidden rounded-neo-xl border-neo-thick border-black bg-neo-navy-light shadow-hard-lg',
        // Desktop bento slot is ~768px wide — switch to a row so the content
        // spreads across the width (no dead navy gap) and vertically centres.
        'md:flex md:min-h-[150px] md:items-center',
        'transition-[transform,box-shadow] duration-150 active:translate-x-px active:translate-y-px active:shadow-hard-pressed',
      )}
    >
      {/* warm amber base tint over the navy — the daily card's signature colour.
          Kept low-opacity so the navy reads through (darker, less saturated gold). */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,225,53,0.11) 0%, rgba(255,107,53,0.06) 55%, transparent 100%)' }}
      />
      {/* golden radial glow on the end (behind the mascot) */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 120% at 100% 50%, rgba(255,225,53,0.16), transparent 60%)' }}
      />
      {/* floating daily mascot */}
      <div className="pointer-events-none absolute -bottom-2.5 -end-3.5 h-[150px] w-[150px] motion-safe:animate-bob md:-bottom-4 md:h-[185px] md:w-[185px]">
        <Image
          src={DAILY_ART}
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL={CUBE_BLUR_DATA_URL}
          sizes="150px"
          className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
        />
      </div>

      <div className="relative max-w-[250px] p-3.5 md:flex md:max-w-none md:items-center md:gap-12 md:py-5 md:ps-7 md:pe-52">
        <div className="md:flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-black bg-neo-yellow px-2.5 py-[3px] font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-navy shadow-hard-sm">
            <span className="relative flex h-[7px] w-[7px]">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-neo-navy" />
            </span>
            {t('daily.title')}
          </span>

          <h2 className="mt-2.5 font-neo-display text-2xl font-bold uppercase leading-none tracking-tight text-neo-cream md:text-3xl">
            {t('landing.home.todaysPuzzle')}
          </h2>
          <div className="mt-1.5 font-neo-body text-xs font-medium text-neo-white/55 tabular-nums md:text-sm" suppressHydrationWarning>
            {t('landing.home.puzzleNo', { n: puzzleNumber })} · {t('landing.home.resetsIn', { time: countdown })}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 md:mt-0 md:gap-1.5">
          {cells.map((filled, i) => (
            <span
              key={i}
              className={cn(
                'h-[13px] w-[13px] rounded-[3px] border-[1.5px] border-black md:h-4 md:w-4',
                filled ? 'bg-neo-yellow' : 'bg-neo-navy/60',
              )}
            />
          ))}
          {streak > 0 && (
            <span className="ms-1.5 inline-flex items-center gap-1 font-neo-display text-[11px] font-semibold text-neo-yellow md:text-xs">
              <Flame className="h-3 w-3 text-neo-orange" strokeWidth={2.4} aria-hidden="true" />
              {t('landing.home.dayStreak', { n: streak })}
            </span>
          )}
        </div>
      </div>

      {/* CTA pill — once today's daily is played it flips from the lime "Play"
          prompt to a calmer "View results" so it never invites a replay it can't
          grant. While the outcome is still resolving we paint a skeleton pill (same
          footprint) rather than guess "Play" — otherwise it would visibly snap to
          "View results" for a player who has already completed today's challenge. */}
      {ctaLoading ? (
        <span
          data-testid="daily-cta-skeleton"
          aria-hidden="true"
          className="absolute end-3.5 top-3.5 md:end-5 md:top-5"
        >
          <NeoSkeleton variant="default" width={104} height={34} className="rounded-neo-pill border-2 border-black" />
        </span>
      ) : (
        <span
          data-testid="daily-cta"
          className={cn(
            'absolute end-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-black px-3 py-[7px] font-neo-display text-[13px] font-bold uppercase shadow-hard transition-transform group-hover:translate-x-0.5 md:end-5 md:top-5 md:px-4 md:py-2 md:text-sm',
            hasPlayed ? 'bg-neo-navy-light text-neo-cream' : 'bg-neo-lime text-neo-navy',
          )}
        >
          {hasPlayed ? (
            <>
              {t('daily.viewResults')}
              {hasSolved && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
            </>
          ) : (
            <>
              {t('daily.play')}
              <Arrow className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </>
          )}
        </span>
      )}
    </Link>
  );
}

export default HomeDailyHero;
