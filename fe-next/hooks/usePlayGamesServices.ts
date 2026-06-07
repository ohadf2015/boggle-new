/**
 * usePlayGamesServices
 *
 * Thin React glue over `utils/nativePGS`. Lazily initializes the Android-only
 * Play Games bridge on mount and exposes an `available` flag (for UI gating)
 * plus the bridge actions. Off Android the actions are safe no-ops that resolve
 * to an `unavailable` result, so callers can invoke them unconditionally.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  initializePlayGames,
  signInPlayGames,
  submitLeaderboardScore,
  unlockAchievement,
  incrementAchievement,
  showLeaderboard,
  showAchievements,
} from '@/utils/nativePGS';

export interface UsePlayGamesServices {
  /** True once the Android bridge is initialized; false on web/iOS. UI gate only. */
  available: boolean;
  signIn: typeof signInPlayGames;
  submitScore: typeof submitLeaderboardScore;
  unlockAchievement: typeof unlockAchievement;
  incrementAchievement: typeof incrementAchievement;
  showLeaderboard: typeof showLeaderboard;
  showAchievements: typeof showAchievements;
}

export function usePlayGamesServices(): UsePlayGamesServices {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initializePlayGames().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    available,
    signIn: signInPlayGames,
    submitScore: submitLeaderboardScore,
    unlockAchievement,
    incrementAchievement,
    showLeaderboard,
    showAchievements,
  };
}
