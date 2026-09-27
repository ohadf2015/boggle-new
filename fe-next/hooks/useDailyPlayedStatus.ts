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

/**
 * Get guest's played state from localStorage
 */
function getGuestPlayedStatus(): DailyPlayedStatus {
  const localStreak = getDailyStreak();
  const today = getDailyChallengeDate();

  // Guest: read localStorage played flags for each mode
  const wordHuntPlayed = !!localStorage.getItem(`wh_played_${today}`);
  const wordWheelPlayed = !!localStorage.getItem(`ww_played_${today}`);
  const connectionsPlayed = !!localStorage.getItem(`connections_played_${today}`);

  return {
    today: {
      wordHunt: wordHuntPlayed,
      wordWheel: wordWheelPlayed,
      wordTower: false, // Guests off-limits or localStorage unmarked
      connections: connectionsPlayed,
    },
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
    let local: DailyPlayedStatus['today'] | null = null;
    try { local = getGuestPlayedStatus().today; } catch { /* storage disabled */ }
    setStatus((prev) => ({
      ...prev,
      today: {
        wordHunt: prev.today.wordHunt || !!local?.wordHunt,
        wordWheel: prev.today.wordWheel || !!local?.wordWheel,
        wordTower: prev.today.wordTower || !!local?.wordTower,
        connections: prev.today.connections || !!local?.connections,
      },
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
        setStatus(data);
      }
    } catch (error) {
      console.error('[useDailyPlayedStatus] fetch error:', error);
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
