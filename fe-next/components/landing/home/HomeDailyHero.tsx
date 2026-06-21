'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useDailyChallengeStats, type PreloadedDailyStats } from '@/hooks/useDailyChallengeStats';
import { CUBE_BLUR_DATA_URL } from '@/lib/landing/modeMeta';
import { dailyWeekCells } from '@/lib/landing/homeHubFormat';
import { getDailyChallengeDate } from '@/utils/dailyChallenge';

const DAILY_ART = '/modes/cubes/daily.png';

/** BCP-47 locale per app language — drives the localized weekday initials in the tracker. */
const WEEKDAY_LOCALE: Record<string, string> = {
  en: 'en-US',
  he: 'he-IL',
  sv: 'sv-SE',
  ja: 'ja-JP',
  es: 'es-ES',
};

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
  // `useDailyChallengeStats` derives the puzzle number/countdown from the date on
  // the client, so SSR (preloaded "loading" 0) ≠ first client render (real #173)
  // → hydration mismatch (incl. the `aria-label`). Gate the date-derived values
  // behind mount: SSR + first client render both paint the loading zero-state,
  // real values commit after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const countdown = mounted ? stats.countdown : '';
  const hasPlayed = mounted ? stats.hasPlayed : false;
  const streak = mounted ? stats.streak : 0;
  const puzzleNumber = mounted ? stats.puzzleNumber : 0;
  // Real per-day completion history (last 7 days, today last). Pre-mount paints a
  // neutral empty week so SSR and first client render agree (no hydration drift).
  const week = mounted ? dailyWeekCells(stats.playedDates, getDailyChallengeDate(), 7) : dailyWeekCells([], '', 7);
  const locale = WEEKDAY_LOCALE[language] ?? 'en-US';
  const weekdayLabel = (iso: string) =>
    iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' }) : '';

  return (
    <Link
      href={`/${language}/daily`}
      data-testid="home-daily-hero"
      onClick={() => trackLandingCtaClick('daily_banner', { mode: 'daily', hasPlayed })}
      aria-label={`${t('daily.title')} #${puzzleNumber}`}
      className={cn(
        'group relative block min-h-[138px] overflow-hidden rounded-neo-xl border-neo-thick border-black shadow-hard-lg',
        'bg-gradient-to-br from-[#2a2410] via-neo-navy-light to-neo-navy-light',
        'transition-[transform,box-shadow] duration-150 active:translate-x-px active:translate-y-px active:shadow-hard-pressed',
      )}
    >
      {/* warm gold radial wash — gives the daily card its signature yellow tint */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(130% 130% at 100% 35%, rgba(255,225,53,0.22), rgba(255,107,53,0.10) 45%, transparent 68%)' }}
      />
      {/* floating daily mascot */}
      <div className="pointer-events-none absolute -bottom-2.5 -end-3.5 h-[150px] w-[150px] motion-safe:animate-bob">
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

      <div className="relative max-w-[250px] p-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-black bg-neo-yellow px-2.5 py-[3px] font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-navy shadow-hard-sm">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-neo-navy" />
          </span>
          {t('daily.title')}
        </span>

        <h2 className="mt-2.5 font-neo-display text-2xl font-bold uppercase leading-none tracking-tight text-neo-cream">
          {t('landing.home.todaysPuzzle')}
        </h2>
        <div className="mt-1.5 font-neo-body text-xs font-medium text-neo-white/55 tabular-nums" suppressHydrationWarning>
          {t('landing.home.puzzleNo', { n: puzzleNumber })} · {t('landing.home.resetsIn', { time: countdown })}
        </div>

        {/* 7-day completion tracker — each column is a real calendar day; lime = solved,
            today gets a gold ring. Replaces the old streak-mirror strip. */}
        <div className="mt-3 flex items-end gap-[5px]" suppressHydrationWarning>
          {week.map((cell, i) => (
            <div key={cell.date || i} className="flex flex-col items-center gap-1">
              <span className="font-neo-body text-[8px] font-semibold uppercase leading-none text-neo-white/40">
                {weekdayLabel(cell.date)}
              </span>
              <span
                className={cn(
                  'h-[14px] w-[14px] rounded-[4px] border-[1.5px] border-black',
                  cell.played ? 'bg-neo-lime' : 'bg-neo-navy',
                  cell.isToday && 'ring-2 ring-neo-yellow ring-offset-1 ring-offset-neo-navy-light',
                )}
              />
            </div>
          ))}
        </div>

        {/* streak readout — always shown so the day-tracking always has a clear label */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 font-neo-display text-[11px] font-semibold">
          <Flame
            className={cn('h-3.5 w-3.5', streak > 0 ? 'text-neo-orange' : 'text-neo-white/35')}
            strokeWidth={2.4}
            aria-hidden="true"
          />
          <span className={streak > 0 ? 'text-neo-yellow' : 'text-neo-white/55'}>
            {streak > 0 ? t('landing.home.dayStreak', { n: streak }) : t('landing.home.streakStart')}
          </span>
        </div>
      </div>

      {/* Play pill */}
      <span className="absolute end-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-black bg-neo-lime px-3 py-[7px] font-neo-display text-[13px] font-bold uppercase text-neo-navy shadow-hard transition-transform group-hover:translate-x-0.5">
        {t('daily.play')}
        <Arrow className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
    </Link>
  );
}

export default HomeDailyHero;
