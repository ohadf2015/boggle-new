/**
 * useWinStreakTracking - Track win streaks for competitive modes
 *
 * Records wins for streak tracking in competitive game modes
 * (solo-bots and challenge, but not practice).
 */

import { useEffect, useRef, useState } from 'react';
import { useWinStreak } from '@/hooks/useWinStreak';
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
    if (mode === 'practice') return;
    if (!isWinner) return; // Only record actual wins

    hasRecordedWinRef.current = true;

    // Check if already won today (streak won't increment in this case)
    const alreadyWonToday = lastWinDate &&
      new Date(lastWinDate).toDateString() === new Date().toDateString();

    // Store previous streak before recording
    const previousStreak = currentStreak;

    // Record the win (handles same-day logic internally)
    recordWin();

    // Calculate the actual new streak value
    // If already won today, streak stays the same; otherwise it increments
    const newStreak = alreadyWonToday ? currentStreak : previousStreak + 1;
    const tierThresholds = [3, 7, 14, 30];
    const isNewMilestone = !alreadyWonToday && tierThresholds.some(t => newStreak === t);

    // Update win streak data for display
    setWinStreakData({
      currentStreak: newStreak,
      bestStreak: Math.max(bestStreak, newStreak),
      isNewMilestone,
      previousStreak,
    });
  }, [mode, isWinner, currentStreak, bestStreak, lastWinDate, isLoaded, recordWin]);

  return { winStreakData };
}
