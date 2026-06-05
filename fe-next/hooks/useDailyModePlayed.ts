import { useEffect, useState } from 'react';
import type { Language } from '@/types';
import {
  hasPlayedWordHuntToday,
  hasPlayedWordWheelToday,
} from '@/utils/dailyChallenge/storage';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { getGuestFingerprint } from '@/utils/guestManager';

export type DailyMode = 'word-hunt' | 'word-wheel';

export interface DailyPlayedIdentity {
  isAuthenticated: boolean;
  playerId?: string | null;
  guestFingerprint?: string | null;
  /** Practice runs never count toward today's challenge — always treated as not-played. */
  isPractice?: boolean;
}

const LOCAL_CHECK: Record<DailyMode, (lang: Language) => boolean> = {
  'word-hunt': hasPlayedWordHuntToday,
  'word-wheel': hasPlayedWordWheelToday,
};

/**
 * Resolves whether the player has completed today's daily challenge for a given
 * mode, in a SPECIFIC language. Per-language by design: a Word Hunt finished in
 * English does NOT count for the Hebrew daily.
 *
 * Resolution is two-tier, mirroring how each daily game already resolves its
 * OWN completion:
 *  1. localStorage (instant, offline-safe).
 *  2. server-of-record cross-device check when localStorage is empty — so a
 *     player who completed the mode on another device (or after clearing cache)
 *     is correctly recognised. Without this, the cross-promo card asks them to
 *     replay a challenge they already finished.
 *
 * The focus/visibility refresh is sticky-true within the (mode, language, day):
 * completion only ever goes false→true, so a later refresh must not clobber a
 * server-confirmed `true` when localStorage stayed empty.
 */
export function useDailyModePlayed(
  mode: DailyMode,
  language: Language,
  identity: DailyPlayedIdentity,
): boolean {
  const { isAuthenticated, playerId, guestFingerprint, isPractice } = identity;
  // Lazy-init from localStorage so an already-completed mode shows the correct
  // CTA on the very first paint (no cross-promo flash before the effect fires).
  const [played, setPlayed] = useState(() => {
    if (typeof window === 'undefined' || isPractice) return false;
    return LOCAL_CHECK[mode](language);
  });

  useEffect(() => {
    const localCheck = LOCAL_CHECK[mode];

    // Practice mode bypasses the gate entirely.
    if (isPractice) {
      setPlayed(false);
      return;
    }

    let cancelled = false;
    const date = getDailyChallengeDate();

    // Tier 1: optimistic local read (also resets sticky state on lang/day change).
    const localPlayed = localCheck(language);
    setPlayed(localPlayed);

    // Tier 2: server-of-record fallback when local is empty.
    const resolveFromServer = async () => {
      if (localPlayed) return;

      const params = new URLSearchParams();
      if (isAuthenticated && playerId) {
        params.set('playerId', playerId);
      } else {
        const fp = guestFingerprint || getGuestFingerprint();
        if (fp) params.set('guestFingerprint', fp);
      }
      if (!params.toString()) return; // no identity to query by

      // AbortSignal.timeout isn't available in every test/runtime — guard it.
      const signal =
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(5000)
          : undefined;

      try {
        const resp = await fetch(
          `/api/daily-challenge/${mode}/check-played/${date}/${language}?${params.toString()}`,
          signal ? { signal } : undefined,
        );
        if (cancelled || !resp.ok) return;
        const data = (await resp.json()) as { hasPlayed?: boolean };
        if (data.hasPlayed) setPlayed(true);
      } catch {
        // Network error / timeout — keep the local value. Worst case the
        // cross-promo CTA shows; submit is deduped server-side anyway.
      }
    };
    resolveFromServer();

    // Reflect a completion that happens in another tab/route without remount.
    const refresh = () => setPlayed((prev) => prev || localCheck(language));
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', refresh);
    };
  }, [mode, language, isAuthenticated, playerId, guestFingerprint, isPractice]);

  return played;
}
