/**
 * useDailyPlayedStatus - Unified daily challenge status across all modes
 *
 * Single source of truth for:
 * - Whether player has played each mode today (wordHunt, wordWheel, wordTower, connections)
 * - Current streak (server-backed for authed, localStorage for guests)
 * - All completed dates (for freeze bridge logic)
 *
 * Strategy:
 * 1. Authed users: skeleton until server resolves (no localStorage flip)
 * 2. Guests: localStorage immediately, never flips
 * 3. Server is authoritative across all devices
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { DailyPlayedStatus } from '@/app/api/daily/status/route';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { getDailyStreak } from '@/utils/dailyChallenge/streaks';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { dailyBestKey, isDailyTowerPlayed } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { getWordHuntResultKey, getWordWheelResultKey } from '@/utils/dailyChallenge/constants';
import { ALL_LANGUAGES } from '@/lib/languageConfig';

type PlayedToday = DailyPlayedStatus['today'];

/**
 * This device's "played today" flags, read from the keys the games actually
 * write: the per-language Word Hunt / Word Wheel result records (any language
 * counts — the server's answer is language-agnostic too), the Connections
 * played marker and the Word Tower daily best.
 *
 * Previously read `wh_played_<date>` / `ww_played_<date>` /
 * `connections_played_<date>`, which nothing writes, so every guest looked
 * like they had played nothing and the results handoff looped them back into
 * Word Wheel instead of reaching "all clear".
 */
function getLocalPlayedToday(): PlayedToday {
  const today = getDailyChallengeDate();
  const anyLanguage = (key: (lang: (typeof ALL_LANGUAGES)[number], date: string) => string) =>
    ALL_LANGUAGES.some((lang) => localStorage.getItem(key(lang, today)) !== null);
  return {
    wordHunt: anyLanguage(getWordHuntResultKey),
    wordWheel: anyLanguage(getWordWheelResultKey),
    // Tower keeps a per-UTC-day best climb; >0 means the daily was played.
    wordTower: isDailyTowerPlayed(localStorage.getItem(dailyBestKey(utcDateKey()))),
    connections: hasPlayedConnectionsToday(),
  };
}

/** Played is monotonic within a day: either source saying "played" wins. */
function mergePlayedToday(a: PlayedToday, b: PlayedToday | null): PlayedToday {
  if (!b) return a;
  return {
    wordHunt: a.wordHunt || b.wordHunt,
    wordWheel: a.wordWheel || b.wordWheel,
    wordTower: a.wordTower || b.wordTower,
    connections: a.connections || b.connections,
  };
}

function readLocalPlayedToday(): PlayedToday | null {
  try { return getLocalPlayedToday(); } catch { return null; /* storage disabled */ }
}

/**
 * Get guest's played state from localStorage
 */
function getGuestPlayedStatus(): DailyPlayedStatus {
  const localStreak = getDailyStreak();
  return {
    today: getLocalPlayedToday(),
    streak: {
      current: localStreak.currentStreak,
      longest: localStreak.longestStreak,
    },
    allCompletedDates: [], // Guest dates not aggregated client-side
    freezeCount: 0,
    loading: false,
    fromServer: false,
  };
}

export function useDailyPlayedStatus(): DailyPlayedStatus & { refresh: () => Promise<void> } {
  const { user, isAuthenticated } = useAuth();
  const playerId = user?.id ?? null;

  // Authed: skeleton until the server resolves. Guest: nothing played, then the
  // layout effect below reads this device's flags before first paint. The init
  // must not touch localStorage — the daily hub SSRs (Sentry JAVASCRIPT-NEXTJS-29G),
  // and reading it during hydration would mismatch the server HTML.
  const [status, setStatus] = useState<DailyPlayedStatus>(() => ({
    today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false },
    streak: { current: 0, longest: 0 },
    allCompletedDates: [],
    freezeCount: 0,
    loading: Boolean(isAuthenticated && playerId),
    fromServer: false,
  }));

  useLayoutEffect(() => {
    if (isAuthenticated && playerId) return;
    try { setStatus(getGuestPlayedStatus()); } catch { /* storage disabled */ }
  }, [isAuthenticated, playerId]);

  const isMounted = useRef(true);
  const isFetching = useRef(false);

  // Server unreachable/refused: stop the skeleton (it used to wait forever) and
  // fall back to this device's played flags, so the CTA never points at a mode
  // the player just finished.
  const settleFromLocal = useCallback(() => {
    if (!isMounted.current) return;
    const local = readLocalPlayedToday();
    setStatus((prev) => ({
      ...prev,
      today: mergePlayedToday(prev.today, local),
      loading: false,
    }));
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!playerId || isFetching.current) return;
    isFetching.current = true;

    try {
      const response = await fetch(`/api/daily/status?userId=${playerId}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn('[useDailyPlayedStatus] status', response.status);
        settleFromLocal();
        return;
      }

      const data = (await response.json()) as DailyPlayedStatus;

      if (isMounted.current) {
        // The server is authoritative ACROSS devices, but a score post from
        // this device may not have landed yet — keep what this device knows.
        setStatus({ ...data, today: mergePlayedToday(data.today, readLocalPlayedToday()) });
      }
    } catch (error) {
      console.warn('[useDailyPlayedStatus] fetch error:', error);
      settleFromLocal();
    } finally {
      isFetching.current = false;
    }
  }, [playerId, settleFromLocal]);

  // Initial load
  useEffect(() => {
    isMounted.current = true;

    if (isAuthenticated && playerId) {
      fetchStatus();
    }

    return () => {
      isMounted.current = false;
    };
  }, [isAuthenticated, playerId, fetchStatus]);

  // Auto-refresh on visibility change
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && playerId) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (isMounted.current) {
            fetchStatus();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(debounceTimer);
    };
  }, [isAuthenticated, playerId, fetchStatus]);

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    await fetchStatus();
  }, [fetchStatus]);

  return {
    ...status,
    refresh,
  };
}
