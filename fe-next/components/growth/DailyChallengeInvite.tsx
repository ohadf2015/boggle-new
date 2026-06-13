'use client';

/**
 * DailyChallengeInvite — post-MP-game conversion surface.
 *
 * Behaviorally targeted: a pure selector (lib/growth/dailyConversionPitch) ranks
 * the strongest pitch from the player's live state (alive streak, win/loss, near-miss).
 * Fully instrumented: impression / click / dismiss events feed PostHog so conversion
 * is measurable per variant.
 *
 * Gating: hidden if unauthenticated, daily status still loading, already played today
 * (canonical useDailyChallengeStatus.hasPlayed — NOT WOTD `playerFound`), dismissed,
 * or the selector returns null.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchWithAuth } from '@/utils/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackCtaClicked } from '@/utils/posthogEngagement';
import { getSecondsUntilNextDaily, formatCountdown } from '@/utils/dailyChallenge/dateUtils';
import {
  selectDailyConversionPitch,
  type DailyPitchVariant,
} from '@/lib/growth/dailyConversionPitch';

const DISMISS_KEY = 'dailyChallengeInvite:dismissed';

const ACCENT = {
  orange: { border: 'border-neo-orange/40', bg: 'bg-neo-orange/15', ring: 'border-neo-orange/30', text: 'text-neo-orange', btn: 'bg-neo-orange text-neo-navy' },
  yellow: { border: 'border-neo-yellow/40', bg: 'bg-neo-yellow/15', ring: 'border-neo-yellow/30', text: 'text-neo-yellow', btn: 'bg-neo-yellow text-neo-navy' },
  cyan: { border: 'border-neo-cyan/40', bg: 'bg-neo-cyan/15', ring: 'border-neo-cyan/30', text: 'text-neo-cyan', btn: 'bg-neo-cyan text-neo-navy' },
} as const;

interface Props {
  isWinner: boolean;
  className?: string;
  placement?: number | null;
  totalPlayers?: number;
  marginToNext?: number | null;
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function DailyChallengeInvite({ isWinner, className, placement = null, totalPlayers, marginToNext = null }: Props) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { hasPlayed, currentStreak, loading } = useDailyChallengeStatus(language);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const shownRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => getSecondsUntilNextDaily());
  const [missed, setMissed] = useState<{ count: number; date: string | null }>({ count: 0, date: null });

  // Only the catchup branch needs this, and only when there's no alive streak.
  const shouldCheckMissed = isAuthenticated && !loading && !hasPlayed && (currentStreak ?? 0) === 0;

  useEffect(() => {
    if (!shouldCheckMissed) return;
    let cancelled = false;
    fetchWithAuth('/api/daily/missed')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.missed?.length) return;
        setMissed({ count: data.missed.length, date: data.missed[0].date ?? null });
      })
      .catch(() => { /* graceful: catchup simply won't fire */ });
    return () => { cancelled = true; };
  }, [shouldCheckMissed]);

  const pitch = !isAuthenticated || loading
    ? null
    : selectDailyConversionPitch({
        hasPlayedToday: hasPlayed,
        currentStreak: currentStreak ?? 0,
        missedDays: missed.count,
        isWinner,
        marginToNext,
        isOnCrazyGames: isOnCrazyGamesPlatform,
      });

  useEffect(() => {
    if (!pitch?.showCountdown) return;
    const id = setInterval(() => setSecondsLeft(getSecondsUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, [pitch?.showCountdown]);

  const variant: DailyPitchVariant | undefined = pitch?.variant;

  // Impression — once per mount, after status settles.
  useEffect(() => {
    if (!pitch || dismissed || shownRef.current) return;
    shownRef.current = true;
    posthog.capture('growth:daily_conversion_shown', {
      variant: pitch.variant,
      surface: 'mp_results',
      streak: currentStreak ?? 0,
      placement: placement ?? null,
      total_players: totalPlayers ?? null,
    });
  }, [pitch, dismissed, currentStreak, placement, totalPlayers]);

  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    setDismissed(true);
    posthog.capture('growth:daily_conversion_dismissed', { variant, surface: 'mp_results' });
  }, [variant]);

  const handleCtaClick = useCallback(() => {
    trackCtaClicked({
      ctaId: 'mp_to_daily',
      location: 'mp_results',
      metadata: { variant, streak: currentStreak ?? 0 },
    });
  }, [variant, currentStreak]);

  if (!pitch || dismissed) return null;

  const accent = ACCENT[pitch.accent];
  const title = t(pitch.titleKey, { count: currentStreak ?? 0 });
  const countdown = pitch.showCountdown ? formatCountdown(secondsLeft) : '';
  const body = t(pitch.bodyKey, { count: currentStreak ?? 0, countdown });
  const ctaHref =
    pitch.variant === 'catchup' && missed.date
      ? `/daily?from=mp_results&date=${missed.date}`
      : '/daily?from=mp_results';

  return (
    <div
      data-testid="daily-challenge-invite"
      data-variant={pitch.variant}
      className={cn(
        'relative flex items-stretch gap-3 w-full',
        'rounded-neo border-neo bg-neo-navy/80 p-4',
        'shadow-hard-sm hover:shadow-hard transition-shadow',
        accent.border,
        className,
      )}
    >
      <button
        type="button"
        data-testid="daily-challenge-invite-dismiss"
        onClick={handleDismiss}
        aria-label={t('dailyInvite.dismiss')}
        className="absolute top-1 end-1 p-1 rounded-md text-white hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className={cn('shrink-0 w-10 h-10 rounded-neo border-neo flex items-center justify-center', accent.bg, accent.ring)}>
        <Sparkles className={cn('w-5 h-5', accent.text)} />
      </div>

      <div className="flex-1 min-w-0 pe-4">
        <p className={cn('text-xs font-neo-display font-bold uppercase tracking-wider mb-0.5', accent.text)}>
          {title}
        </p>
        <p data-testid="daily-challenge-invite-body" className="text-sm font-neo-body text-neo-white leading-snug">
          {body}
        </p>
      </div>

      <Link
        href={ctaHref}
        onClick={handleCtaClick}
        data-testid="daily-challenge-invite-cta"
        className={cn(
          'self-center shrink-0 px-3 py-2 rounded-neo border-neo border-black',
          'text-xs font-neo-display font-bold uppercase tracking-wider',
          'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-shadow',
          accent.btn,
        )}
      >
        {t(pitch.ctaKey)}
      </Link>
    </div>
  );
}

export default DailyChallengeInvite;
