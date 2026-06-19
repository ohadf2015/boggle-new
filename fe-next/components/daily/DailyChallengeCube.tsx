'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, Check, Clock, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useDailyChallengeStats, type PreloadedDailyStats } from '@/hooks/useDailyChallengeStats';
import { CUBE_BLUR_DATA_URL } from '@/lib/landing/modeMeta';

interface DailyChallengeCubeProps {
  /** Pre-loaded daily stats from the landing page to avoid a duplicate fetch. */
  preloadedStats?: PreloadedDailyStats;
}

/** Full-bleed cube art — the daily mode in the SAME grammar as the bento cubes:
 *  a DARK navy tile where the colour comes from the mascot art, not the fill
 *  (homepage brief — dark base, image is the colour). Gold (neo-yellow) survives
 *  only as the *accent* — the DAILY headline, the puzzle badge and the mascot's
 *  hourglass — so the daily tile is the one warm note without being a colour block. */
const DAILY_CUBE_ART = '/modes/cubes/daily.png';

/**
 * DailyChallengeCube — the `landing-daily-cube-v1: cube` daily hero for the
 * homepage `cubes` arm. A wide gold neo-brutalist tile: cube art bleeds from the
 * end, content sits on the start, with the shared `.cube-sheen` idle glance so it
 * belongs to the bento. Surfaces puzzle #, countdown, streak, and win/loss.
 */
const DailyChallengeCube: React.FC<DailyChallengeCubeProps> = ({ preloadedStats }) => {
  const { t, language, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const { countdown, hasPlayed, hasSolved, streak, puzzleNumber } =
    useDailyChallengeStats(preloadedStats);

  return (
    <Link
      href={`/${language}/daily`}
      data-testid="daily-challenge-cube"
      onClick={() => trackLandingCtaClick('daily_banner', { mode: 'daily', hasPlayed })}
      aria-label={`${t('daily.badge')} #${puzzleNumber}`}
      className={cn(
        // Quiet gold colour-coding folded into a 2px tinted hard border (matches the
        // mode cubes) instead of the loud 3px black frame + offset slab. Slimmer, one
        // warm note on the page — not a shouting banner. Gold brightens on hover.
        'cube-reveal group relative flex min-h-[84px] w-full items-stretch overflow-hidden rounded-neo border-2 border-neo-yellow/45 bg-neo-navy transition-[transform,border-color] duration-150 sm:min-h-[96px]',
        'hover:-translate-y-0.5 hover:border-neo-yellow/80',
        'focus-visible:-translate-y-0.5',
        'active:translate-y-0',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
      )}
    >
      {/* Daily mascot — a neat, sizeable sticker hugging the end of the slim strip.
          (The asset is a centred mascot with its own margins, so it reads as a tidy
          sticker rather than full-bleed art; zoomed a touch to give it presence.) */}
      <div className="pointer-events-none absolute inset-y-0 end-1 z-0 aspect-square h-full sm:end-2">
        <Image
          src={DAILY_CUBE_ART}
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL={CUBE_BLUR_DATA_URL}
          sizes="(max-width: 768px) 120px, 140px"
          className="scale-110 object-contain object-center transition-transform duration-200 motion-safe:group-hover:scale-[1.16]"
        />
      </div>

      {/* Shared idle "glance" sweep — same primitive the mode cubes use, CSS-gated
          on prefers-reduced-motion so it shimmers even on low-end devices. */}
      <span
        aria-hidden="true"
        data-testid="cube-sheen"
        className="cube-sheen pointer-events-none absolute inset-y-0 -left-1/3 z-[1] w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
      />

      {/* Content — white ink on navy with a GOLD headline accent, kept clear of
          the end art. */}
      <div className="relative z-[2] flex flex-1 flex-col justify-center gap-1.5 p-3 pe-24 text-neo-white sm:p-4 sm:pe-28">
        <div className="flex items-center gap-2">
          <h2
            className="font-neo-display text-lg font-black uppercase leading-none tracking-tight text-neo-yellow sm:text-xl"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            {t('daily.badge')}
          </h2>
          <span className="shrink-0 rounded-neo border-2 border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black leading-none text-neo-navy shadow-hard-sm">
            #{puzzleNumber}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-neo border-2 border-black bg-neo-navy-light px-2 py-0.5 font-neo-body text-[0.7rem] font-bold text-neo-white">
              <Flame className="h-3.5 w-3.5 text-neo-orange" aria-hidden="true" />
              {streak} {t('daily.dayStreak')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-neo border-2 border-black bg-neo-navy-light px-2 py-0.5 font-neo-body text-[0.7rem] font-bold tabular-nums text-neo-white">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {hasPlayed ? (
              <>
                <span className="opacity-80">{t('daily.nextPuzzleIn')}:</span>
                &nbsp;
                <span className="font-black" suppressHydrationWarning>{countdown}</span>
              </>
            ) : (
              <span className="font-black" suppressHydrationWarning>{countdown}</span>
            )}
          </span>
        </div>
      </div>

      {/* Outcome badge (played) or forward arrow (unplayed), bottom-end corner —
          on the gold corner, above the art. */}
      <span
        className={cn(
          'absolute bottom-3 end-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full border-2 border-black shadow-hard-sm sm:h-10 sm:w-10',
          hasPlayed
            ? hasSolved
              ? 'bg-neo-lime text-neo-navy'
              : 'bg-neo-pink text-neo-navy'
            : 'bg-neo-yellow text-neo-navy transition-transform group-hover:translate-x-0.5',
        )}
        data-testid={hasPlayed ? (hasSolved ? 'won-badge' : 'lost-badge') : undefined}
        aria-hidden="true"
      >
        {hasPlayed ? (
          hasSolved ? <Check className="h-5 w-5" strokeWidth={3} /> : <X className="h-5 w-5" strokeWidth={3} />
        ) : (
          <Arrow className="h-5 w-5" strokeWidth={3} />
        )}
      </span>
    </Link>
  );
};

export default DailyChallengeCube;
