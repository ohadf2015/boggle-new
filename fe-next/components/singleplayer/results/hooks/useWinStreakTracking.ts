/**
 * useWinStreakTracking - Track win streaks for competitive modes
 *
 * Records wins for streak tracking in competitive game modes
 * (solo-bots and challenge, but not practice).
 */

import { useEffect, useRef, useState } from 'react';
import { useWinStreak } from '@/hooks/useWinStreak';
import logger from '@/utils/logger';
import type { SinglePlayerMode } from '../../SinglePlayerView';

interface UseWinStreakTrackingParams {
  mode: SinglePlayerMode;
  isWinner: boolean;
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
 * Hook to track win streaks for competitive game modes
 * Only records wins in solo-bots and challenge modes, not practice
 *
 * IMPORTANT: This hook waits for localStorage data to be loaded before
 * processing wins to avoid the race condition where streak data is read
 * before it's available, causing users to always see "1 day streak".
 */
export function useWinStreakTracking({
  mode,
  isWinner,
}: UseWinStreakTrackingParams): WinStreakTrackingResult {
  const {
    currentStreak,
    bestStreak,
    lastWinDate,
    isLoaded,
    recordWin,
  } = useWinStreak();

  const [winStreakData, setWinStreakData] = useState<WinStreakDisplayData | null>(null);
  const hasRecordedWinRef = useRef(false);

  useEffect(() => {
    // CRITICAL: Wait for localStorage data to be loaded before processing
    // This fixes the bug where currentStreak was always 0 (DEFAULT_STREAK_DATA)
    if (!isLoaded) return;

    if (hasRecordedWinRef.current) return;
    // Track wins in competitive modes (solo-bots and challenge), but not practice
    if (mode === 'practice') {
      logger.debug('[WinStreakTracking] Skipping - practice mode');
      return;
    }
    if (!isWinner) {
      logger.debug('[WinStreakTracking] Skipping - not a winner (isWinner:', isWinner, ')');
      return; // Only record actual wins
    }

    hasRecordedWinRef.current = true;

    logger.debug('[WinStreakTracking] Recording win', {
      mode,
      isWinner,
      currentStreakFromHook: currentStreak,
      lastWinDate,
    });

    // Record the win and get the authoritative streak data
    // This ensures we use the same calculated values that were saved to localStorage
    const result = recordWin();

    const tierThresholds = [3, 7, 14, 30];
    const isNewMilestone = !result.alreadyWonToday && tierThresholds.some(t => result.newStreak === t);

    logger.debug('[WinStreakTracking] Win recorded with result', {
      previousStreak: result.previousStreak,
      newStreak: result.newStreak,
      bestStreak: result.bestStreak,
      alreadyWonToday: result.alreadyWonToday,
      isNewMilestone,
    });

    // Update win streak data for display using the authoritative values from recordWin()
    setWinStreakData({
      currentStreak: result.newStreak,
      bestStreak: result.bestStreak,
      isNewMilestone,
      previousStreak: result.previousStreak,
    });
  }, [mode, isWinner, currentStreak, bestStreak, lastWinDate, isLoaded, recordWin]);

  return { winStreakData };
}
