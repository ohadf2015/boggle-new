'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Trophy, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWinStreak } from '@/hooks/useWinStreak';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { isDailyHubDoneLocally } from '@/lib/results/isDailyHubDoneLocally';
import type { Language } from '@/types';

const DISMISS_KEY = 'lc:tomorrow-card-dismissed';

export type TomorrowCardSource = 'solo' | 'mp';
export type TomorrowCardVariant = 'finish-today' | 'keep-streak';

export interface TomorrowCardProps {
  /** Results surface that mounted the card — analytics only. */
  source?: TomorrowCardSource;
  /** When omitted, probe local daily hub completion for the active language. */
  dailyDoneToday?: boolean;
  /** When omitted, read from useWinStreak (same source as StreakIgnitionCard). */
  streak?: number;
  isStreakLoaded?: boolean;
}

/**
 * Seconds until the next UTC midnight — same boundary as board + completion
 * identity (`getDailyChallengeDate` / `getSecondsUntilNextDaily`).
 * Accepts an injectable `now` for timezone-boundary tests.
 */
export function getSecondsToMidnight(now: Date = new Date()): number {
  const tomorrow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  return Math.max(0, Math.floor((tomorrow - now.getTime()) / 1000));
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

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * TomorrowCard — persistent post-game daily hook.
 *
 * After every finished solo/MP (series-end) results visit: CTA into today's
 * remaining daily quests, or a keep-streak countdown once the hub is cleared.
 * Dismissible for the session via sessionStorage. Guests see the card without
 * an invented streak. Countdown is UTC midnight (board identity) via setInterval(1s), NOT rAF.
 */
const TomorrowCard: React.FC<TomorrowCardProps> = memo(({
  source = 'solo',
  dailyDoneToday: dailyDoneProp,
  streak: streakProp,
  isStreakLoaded: streakLoadedProp,
}) => {
  const { t, language } = useLanguage();
  const winStreak = useWinStreak();
  const streak = streakProp ?? winStreak.currentStreak;
  const isStreakLoaded = streakLoadedProp ?? winStreak.isLoaded;

  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const [localDailyDone, setLocalDailyDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsToMidnight());
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    setDismissed(readDismissed());
    if (dailyDoneProp === undefined) {
      try {
        setLocalDailyDone(isDailyHubDoneLocally(language as Language));
      } catch {
        setLocalDailyDone(false);
      }
    }
    setReady(true);
  }, [dailyDoneProp, language]);

  const dailyDoneToday = dailyDoneProp ?? localDailyDone;
  const variant: TomorrowCardVariant = dailyDoneToday ? 'keep-streak' : 'finish-today';

  useEffect(() => {
    if (!ready || dismissed) return;
    if (!hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackGrowthEvent('tomorrow_card_shown', {
        seconds_to_midnight: secondsLeft,
        variant,
        streak: isStreakLoaded ? streak : 0,
        daily_done: dailyDoneToday,
        source,
      });
    }
    // Tick countdown + re-probe hub completion across UTC midnight so keep-streak
    // copy does not stick after the board identity rolls over. Parent-provided
    // dailyDoneToday skips the probe (prop remains source of truth).
    const tick = () => {
      setSecondsLeft(getSecondsToMidnight());
      if (dailyDoneProp === undefined) {
        try {
          setLocalDailyDone(isDailyHubDoneLocally(language as Language));
        } catch {
          /* storage off */
        }
      }
    };
    if (variant !== 'keep-streak' && dailyDoneProp !== undefined) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track once with mount-time values
  }, [ready, dismissed, variant, dailyDoneProp, language]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage off */
    }
  }, []);

  const onCtaClick = useCallback(() => {
    trackGrowthEvent('postgame_daily_cta_clicked', { variant, source });
  }, [variant, source]);

  if (!ready || dismissed) return null;

  const titleKey = variant === 'finish-today'
    ? 'results.tomorrowCard.titleFinish'
    : 'results.tomorrowCard.titleKeep';
  const ctaKey = variant === 'finish-today'
    ? 'results.tomorrowCard.ctaFinish'
    : 'results.tomorrowCard.ctaKeep';
  const href = `/${language}/daily`;
  const showStreak = isStreakLoaded && streak > 0;

  return (
    <section
      data-testid="tomorrow-card"
      aria-label={t(titleKey)}
      className="relative bg-neo-navy-light border-neo-thick border-neo-black shadow-hard rounded-neo p-4 sm:p-5 overflow-hidden min-h-[120px]"
    >
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-amber-400 via-neo-yellow to-amber-600"
      />

      <button
        type="button"
        onClick={dismiss}
        aria-label={t('results.tomorrowCard.dismiss')}
        className="absolute top-2 end-2 flex h-8 w-8 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-navy text-neo-white/70 hover:text-neo-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex items-center gap-2 mb-2 pe-8">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-amber-400 shadow-hard-sm">
          <Trophy className="h-5 w-5 text-neo-black" aria-hidden />
        </span>
        <h3 className="font-neo-display text-lg sm:text-xl font-black uppercase tracking-wide text-neo-white">
          {t(titleKey)}
        </h3>
      </div>

      {showStreak && (
        <p data-testid="tomorrow-streak" className="mb-2 text-sm font-bold text-neo-yellow">
          {t('results.tomorrowCard.streakLabel', { n: streak })}
        </p>
      )}

      {variant === 'keep-streak' && (
        <p
          data-testid="tomorrow-countdown"
          className="mb-3 text-xl lg:text-2xl font-black tabular-nums text-neo-yellow"
        >
          {t('results.tomorrowCard.countdown', {
            time: formatCountdown(secondsLeft, language as string),
          })}
        </p>
      )}

      <Link
        href={href}
        onClick={onCtaClick}
        className="inline-flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-yellow px-4 py-2 text-sm font-black uppercase tracking-wide text-neo-black shadow-hard-sm hover:translate-y-px"
      >
        {t(ctaKey)}
      </Link>
    </section>
  );
});

TomorrowCard.displayName = 'TomorrowCard';

export default TomorrowCard;
