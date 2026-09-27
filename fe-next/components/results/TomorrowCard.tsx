'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';

/** Seconds until the next LOCAL midnight (the daily-challenge reset). */
export function getSecondsToMidnight(now: Date = new Date()): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 1000));
}

/** hh:mm:ss with locale digits (Intl.NumberFormat), no grouping separators. */
export function formatCountdown(totalSeconds: number, locale: string): string {
  const nf = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${nf.format(hours)}:${nf.format(minutes)}:${nf.format(seconds)}`;
}

/**
 * TomorrowCard — the persistent tomorrow hook for first-session players
 * (t_89663cfc "Streak Ignition").
 *
 * Replaces TomorrowPreview's 3-second auto-dismissing banner on the
 * first-session path: a hook that vanishes before it is read is not a hook.
 * This card stays on the results screen with a live countdown to the local
 * midnight reset. First-session only (<= 1 completed game on this device) —
 * returning players already have the daily habit surfaces; SSR-safe because
 * the parent mounts it via dynamic(ssr:false), so the localStorage read in
 * the state initializer only ever runs on the client.
 *
 * Countdown uses setInterval(1s), NOT requestAnimationFrame (CWV budget).
 * Numerals are >= 24px on lg screens for 10-foot readability.
 */
const TomorrowCard: React.FC = memo(() => {
  const { t, language } = useLanguage();
  const [isFirstSession] = useState(() => readGamesCompletedCount() <= 1);
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsToMidnight());
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!isFirstSession) return;
    if (!hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackGrowthEvent('tomorrow_card_shown', { seconds_to_midnight: secondsLeft });
    }
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsToMidnight());
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track once with the mount-time value
  }, [isFirstSession]);

  if (!isFirstSession) return null;

  return (
    <section
      aria-label={t('results.tomorrowCard.title')}
      className="relative bg-neo-navy-light border-neo-thick border-neo-black shadow-hard rounded-neo p-4 sm:p-5 overflow-hidden min-h-[120px]"
    >
      {/* Decorative accent stripe — amber for the daily challenge */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-amber-400 via-neo-yellow to-amber-600"
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-amber-400 shadow-hard-sm">
          <Trophy className="h-5 w-5 text-neo-black" aria-hidden />
        </span>
        <h3 className="font-neo-display text-lg sm:text-xl font-black uppercase tracking-wide text-neo-white">
          {t('results.tomorrowCard.title')}
        </h3>
      </div>

      <p
        data-testid="tomorrow-countdown"
        className="text-xl lg:text-2xl font-black tabular-nums text-neo-yellow"
      >
        {t('results.tomorrowCard.countdown', {
          time: formatCountdown(secondsLeft, language as string),
        })}
      </p>
    </section>
  );
});

TomorrowCard.displayName = 'TomorrowCard';

export default TomorrowCard;
