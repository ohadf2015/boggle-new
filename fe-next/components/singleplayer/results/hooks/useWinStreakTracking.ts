/**
 * useWinStreakTracking - Track play streaks for all game modes
 *
 * Records game completions for streak tracking across all modes.
 * The streak is a "consecutive days played" streak, not a win streak.
 * Any game mode completion counts (singleplayer, daily, multiplayer, etc.).
 */

import { useEffect, useRef, useState } from 'react';
import { useWinStreak } from '@/hooks/useWinStreak';
import logger from '@/utils/logger';

interface UseWinStreakTrackingParams {
  /** Whether the game has been completed (any mode) */
  isGameComplete: boolean;
}

export interface WinStreakDisplayData {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

interface WinStreakTrackingResult {
  winStreakData: WinStreakDisplayData | null;
}

/**
 * Hook to track play streaks for any game mode
 *
 * Records any game completion (win or loss) to the universal streak.
 * The streak tracks consecutive days of playing, not consecutive wins.
 *
 * IMPORTANT: This hook waits for localStorage data to be loaded before
 * processing to avoid the race condition where streak data is read
 * before it's available, causing users to always see "1 day streak".
 */
export function useWinStreakTracking({
  isGameComplete,
}: UseWinStreakTrackingParams): WinStreakTrackingResult {
  const {
    currentStreak,
    bestStreak,
    lastWinDate,
    isLoaded,
    recordWin,
  } = useWinStreak();

  const [winStreakData, setWinStreakData] = useState<WinStreakDisplayData | null>(null);
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    // CRITICAL: Wait for localStorage data to be loaded before processing
    // This fixes the bug where currentStreak was always 0 (DEFAULT_STREAK_DATA)
    if (!isLoaded) return;

    if (hasRecordedRef.current) return;
    if (!isGameComplete) return;

    hasRecordedRef.current = true;

    logger.debug('[StreakTracking] Recording game completion', {
      currentStreakFromHook: currentStreak,
      lastWinDate,
    });

    // Record the game completion and get the authoritative streak data
    const result = recordWin();

    const tierThresholds = [3, 7, 14, 30];
    const isNewMilestone = !result.alreadyWonToday && tierThresholds.some(t => result.newStreak === t);

    logger.debug('[StreakTracking] Game recorded with result', {
      previousStreak: result.previousStreak,
      newStreak: result.newStreak,
      bestStreak: result.bestStreak,
      alreadyWonToday: result.alreadyWonToday,
      isNewMilestone,
    });

    // Update streak data for display using the authoritative values from recordWin()
    setWinStreakData({
      currentStreak: result.newStreak,
      bestStreak: result.bestStreak,
      isNewMilestone,
      previousStreak: result.previousStreak,
    });
  }, [isGameComplete, currentStreak, bestStreak, lastWinDate, isLoaded, recordWin]);

  return { winStreakData };
}
