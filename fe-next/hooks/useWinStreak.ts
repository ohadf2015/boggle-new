/**
 * Win Streak Hook
 * Tracks consecutive wins for gamification and retention
 */

import { useState, useEffect, useCallback } from 'react';

const STREAK_KEY = 'lexiclash_win_streak';
const STREAK_DATE_KEY = 'lexiclash_streak_date';
const BEST_STREAK_KEY = 'lexiclash_best_streak';
const TOTAL_WINS_KEY = 'lexiclash_total_wins';

export interface WinStreakData {
  currentStreak: number;
  bestStreak: number;
  totalWins: number;
  lastWinDate: string | null;
  isStreakActive: boolean;
  streakBroken: boolean;
}

/**
 * Check if two dates are the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Check if date is yesterday
 */
const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

/**
 * Get streak data from localStorage
 */
const getStoredStreakData = (): WinStreakData => {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 0,
      bestStreak: 0,
      totalWins: 0,
      lastWinDate: null,
      isStreakActive: false,
      streakBroken: false,
    };
  }

  const currentStreak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  const bestStreak = parseInt(localStorage.getItem(BEST_STREAK_KEY) || '0', 10);
  const totalWins = parseInt(localStorage.getItem(TOTAL_WINS_KEY) || '0', 10);
  const lastWinDate = localStorage.getItem(STREAK_DATE_KEY);

  // Check if streak is still active
  let isStreakActive = false;
  let streakBroken = false;

  if (lastWinDate) {
    const lastDate = new Date(lastWinDate);
    const today = new Date();

    if (isSameDay(lastDate, today)) {
      // Won today - streak is active
      isStreakActive = true;
    } else if (isYesterday(lastDate)) {
      // Won yesterday - streak is active but needs a win today to continue
      isStreakActive = true;
    } else {
      // Gap > 1 day - streak was broken
      streakBroken = currentStreak > 0;
    }
  }

  return {
    currentStreak: streakBroken ? 0 : currentStreak,
    bestStreak,
    totalWins,
    lastWinDate,
    isStreakActive,
    streakBroken,
  };
};

/**
 * Save streak data to localStorage
 */
const saveStreakData = (data: Partial<WinStreakData>): void => {
  if (typeof window === 'undefined') return;

  if (data.currentStreak !== undefined) {
    localStorage.setItem(STREAK_KEY, data.currentStreak.toString());
  }
  if (data.bestStreak !== undefined) {
    localStorage.setItem(BEST_STREAK_KEY, data.bestStreak.toString());
  }
  if (data.totalWins !== undefined) {
    localStorage.setItem(TOTAL_WINS_KEY, data.totalWins.toString());
  }
  if (data.lastWinDate !== undefined && data.lastWinDate !== null) {
    localStorage.setItem(STREAK_DATE_KEY, data.lastWinDate);
  }
};

/**
 * Hook to manage win streaks
 */
export const useWinStreak = () => {
  const [streakData, setStreakData] = useState<WinStreakData>(getStoredStreakData);

  // Refresh streak data on mount
  useEffect(() => {
    const data = getStoredStreakData();

    // If streak was broken, reset it
    if (data.streakBroken) {
      saveStreakData({ currentStreak: 0 });
      data.currentStreak = 0;
    }

    setStreakData(data);
  }, []);

  /**
   * Record a new win
   */
  const recordWin = useCallback(() => {
    const today = new Date().toISOString();
    const currentData = getStoredStreakData();

    // Check if already won today
    if (currentData.lastWinDate) {
      const lastDate = new Date(currentData.lastWinDate);
      const todayDate = new Date();

      if (isSameDay(lastDate, todayDate)) {
        // Already won today - don't increment streak, but still count the win
        const newTotalWins = currentData.totalWins + 1;
        saveStreakData({ totalWins: newTotalWins });
        setStreakData(prev => ({ ...prev, totalWins: newTotalWins }));
        return;
      }
    }

    // Calculate new streak
    let newStreak: number;

    if (currentData.isStreakActive && !currentData.streakBroken) {
      // Continuing streak
      newStreak = currentData.currentStreak + 1;
    } else {
      // Starting new streak
      newStreak = 1;
    }

    const newBestStreak = Math.max(newStreak, currentData.bestStreak);
    const newTotalWins = currentData.totalWins + 1;

    const newData: WinStreakData = {
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      totalWins: newTotalWins,
      lastWinDate: today,
      isStreakActive: true,
      streakBroken: false,
    };

    saveStreakData(newData);
    setStreakData(newData);
  }, []);

  /**
   * Get streak emoji based on streak length
   */
  const getStreakEmoji = useCallback((streak: number): string => {
    if (streak >= 30) return '👑';
    if (streak >= 14) return '💎';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    if (streak >= 1) return '✨';
    return '🎮';
  }, []);

  /**
   * Get streak tier name
   */
  const getStreakTier = useCallback((streak: number): string => {
    if (streak >= 30) return 'legendary';
    if (streak >= 14) return 'epic';
    if (streak >= 7) return 'fire';
    if (streak >= 3) return 'hot';
    if (streak >= 1) return 'starting';
    return 'none';
  }, []);

  /**
   * Check if streak is at risk (won yesterday but not today)
   */
  const isStreakAtRisk = useCallback((): boolean => {
    if (!streakData.lastWinDate || streakData.currentStreak === 0) return false;

    const lastDate = new Date(streakData.lastWinDate);
    const today = new Date();

    // Streak is at risk if last win was yesterday (not today)
    return isYesterday(lastDate) && !isSameDay(lastDate, today);
  }, [streakData]);

  return {
    ...streakData,
    recordWin,
    getStreakEmoji,
    getStreakTier,
    isStreakAtRisk: isStreakAtRisk(),
  };
};

export default useWinStreak;
