'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { useRetentionStreak } from '@/hooks/useRetentionStreak';

export interface AccountStreakState {
  /** Streak to display right now. */
  streak: number;
  /** True until the value above is known — render a skeleton, not a number,
   *  while this is true (never a guessed value that then jumps). */
  loading: boolean;
}

/**
 * Single source of truth for every home-screen streak pill (`HomeTopBar`'s
 * pill and the header `StreakBadge`).
 *
 * Before this hook, both read `useRetentionStreak()` directly — a purely
 * local, per-device counter (#1087) — so the same signed-in account could
 * show a different number in the header than in the daily-puzzle card on a
 * different device (user report: header "3", profile chip "1", daily card
 * "1"). `useWeeklyChest` is the chest-authoritative, ACCOUNT-wide streak —
 * the same server number `HomeDailyHero` shows — and it already
 * request-dedupes across simultaneous mounts on one page (module-level cache
 * in `useWeeklyChest.ts`), so having both consumers call it directly here
 * does not add extra network calls.
 *
 * - Signed-in player → the server/account streak (`useWeeklyChest`).
 * - Guest (no account) → the only signal that exists for them, the
 *   device-local `useRetentionStreak`.
 */
export function useAccountStreak(): AccountStreakState {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const weeklyChest = useWeeklyChest();
  const { streak: retentionStreak } = useRetentionStreak();

  if (!isAuthenticated) {
    return { streak: retentionStreak, loading: authLoading };
  }

  return {
    streak: weeklyChest.currentStreak,
    loading: authLoading || weeklyChest.loading,
  };
}

export default useAccountStreak;
