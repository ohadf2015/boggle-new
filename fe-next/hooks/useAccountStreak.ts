'use client';

import { useStreakView } from '@/hooks/useStreakView';

export interface AccountStreakState {
  /** Streak to display right now. */
  streak: number;
  /** True until the value above is known — render a skeleton, not a number,
   *  while this is true (never a guessed value that then jumps). */
  loading: boolean;
  /** Streak freezes banked on the account; 0 for guests (they have none). */
  freezes: number;
  isGuest: boolean;
}

/**
 * The streak count for the header badge and home pills: a thin view over
 * `useStreakView`, so every streak surface shows the same number (account
 * streak when signed in, device-local retention streak for a guest).
 */
export function useAccountStreak(): AccountStreakState {
  const view = useStreakView();
  return { streak: view.current, loading: view.loading, freezes: view.freezes, isGuest: view.isGuest };
}

export default useAccountStreak;
