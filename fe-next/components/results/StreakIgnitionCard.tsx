'use client';

import React, { memo, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

interface StreakIgnitionCardProps {
  /** Whether the player won the game that just ended. */
  won: boolean;
  /** Current streak from useWinStreak — displayed truthfully, never invented. */
  currentStreak: number;
  /** Whether useWinStreak has finished reading localStorage. The shown event
   *  and the lit day row wait for this so analytics never record a false
   *  day-0. The card itself renders immediately behind a fixed min-h so the
   *  late-arriving data causes zero layout shift. */
  isLoaded: boolean;
}

const STREAK_DAYS = 7;

/**
 * StreakIgnitionCard — the first-session payoff (t_89663cfc "Streak Ignition").
 *
 * The streak used to increment invisibly on the solo results screen: tracked
 * by useWinStreak, shown by nothing. This card mounts directly below the
 * celebration hero and makes the streak the reason to come back — won:
 * "STREAK IGNITED!" with the 7-day row lit up to today; lost: "ONE WIN TO
 * IGNITE". It reflects the EXISTING streak mechanic truthfully (product
 * decision, t_1d5371ad) — visibility fix, not an economy change.
 *
 * Neo-brutalist per .impeccable.md, no new dependencies, no images (lucide
 * Flame + CSS pulse). Mounted via dynamic(ssr:false) by the parent. The day
 * row inherits `dir` — do NOT hardcode ltr (RTL: the row flows right-to-left).
 */
const StreakIgnitionCard: React.FC<StreakIgnitionCardProps> = memo(({
  won,
  currentStreak,
  isLoaded,
}) => {
  const { t } = useLanguage();
  const hasTrackedRef = useRef(false);

  // Fire once, only after the streak has loaded from localStorage — firing on
  // mount would record the pre-load default (day 0) for every single view.
  useEffect(() => {
    if (!isLoaded || hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackGrowthEvent('streak_ignition_shown', {
      day: currentStreak,
      won,
      variant: won ? 'won' : 'lost',
    });
  }, [isLoaded, currentStreak, won]);

  const litDays = isLoaded ? Math.min(currentStreak, STREAK_DAYS) : 0;

  return (
    <section
      aria-label={t(won ? 'results.streakIgnition.titleWon' : 'results.streakIgnition.titleLost')}
      className={cn(
        'relative bg-neo-navy-light border-neo-thick border-neo-black shadow-hard rounded-neo',
        'p-4 sm:p-5 overflow-hidden min-h-[160px]',
      )}
    >
      {/* Decorative accent stripe — flame gradient for the streak card */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-neo-red via-neo-yellow to-neo-lime"
      />

      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm',
            won ? 'bg-neo-red' : 'bg-neo-navy',
          )}
        >
          <Flame
            className={cn('h-5 w-5', won ? 'text-neo-black motion-safe:animate-pulse' : 'text-neo-red')}
            aria-hidden
          />
        </span>
        <h3 className="font-neo-display text-lg sm:text-xl font-black uppercase tracking-wide text-neo-white">
          {t(won ? 'results.streakIgnition.titleWon' : 'results.streakIgnition.titleLost')}
        </h3>
      </div>

      {/* 7-day row. Inherits `dir` from the page — in RTL the row flows
          right-to-left with no special casing. */}
      <div data-testid="streak-day-row" className="mb-3 flex items-stretch gap-1.5">
        {Array.from({ length: STREAK_DAYS }, (_, i) => {
          const day = i + 1;
          const lit = day <= litDays;
          return (
            <div
              key={day}
              data-testid={`streak-day-${day}`}
              data-lit={lit}
              aria-label={t('results.streakIgnition.day', { n: day })}
              className={cn(
                'flex h-10 flex-1 items-center justify-center rounded-neo border-2 border-neo-black',
                'text-sm font-black',
                lit
                  ? 'bg-neo-red text-neo-black shadow-hard-sm'
                  : 'bg-neo-navy text-neo-white/40',
              )}
            >
              {lit ? <Flame className="h-4 w-4" aria-hidden /> : day}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-neo-white leading-snug">
        {t(won ? 'results.streakIgnition.body' : 'results.streakIgnition.bodyLost')}
      </p>
    </section>
  );
});

StreakIgnitionCard.displayName = 'StreakIgnitionCard';

export default StreakIgnitionCard;
