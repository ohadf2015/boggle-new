/**
 * Win Streak Hook
 * Tracks consecutive wins for gamification and retention
 */

import { useState, useEffect, useCallback } from 'react';

const STREAK_KEY = 'lexiclash_win_streak';
const STREAK_DATE_KEY = 'lexiclash_streak_date';
const BEST_STREAK_KEY = 'lexiclash_best_streak';
const TOTAL_WINS_KEY = 'lexiclash_total_wins';
const STREAK_FREEZES_KEY = 'lexiclash_streak_freezes';
const FREEZE_LAST_AWARDED_KEY = 'lexiclash_freeze_last_awarded';
const BROKEN_STREAK_KEY = 'lexiclash_broken_streak';
const BROKEN_STREAK_DATE_KEY = 'lexiclash_broken_streak_date';

/** Cost in coins to recover a broken streak */
export const STREAK_RECOVERY_COST = 500;
/** Number of free freezes awarded per week */
export const FREE_FREEZES_PER_WEEK = 1;
/** Hours within which a broken streak can be recovered */
export const RECOVERY_WINDOW_HOURS = 24;

export interface WinStreakData {
  currentStreak: number;
  bestStreak: number;
  totalWins: number;
  lastWinDate: string | null;
  isStreakActive: boolean;
  streakBroken: boolean;
  /** Number of streak freezes available */
  freezesAvailable: number;
  /** Broken streak that can be recovered */
  recoverableStreak: number | null;
  /** Time remaining to recover broken streak (ms) */
  recoveryTimeRemaining: number | null;
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
 * Check if a week has passed since a date
 */
const isNewWeek = (date: Date): boolean => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 7;
};

/**
 * Default streak data (used for SSR and initial state)
 */
const DEFAULT_STREAK_DATA: WinStreakData = {
  currentStreak: 0,
  bestStreak: 0,
  totalWins: 0,
  lastWinDate: null,
  isStreakActive: false,
  streakBroken: false,
  freezesAvailable: FREE_FREEZES_PER_WEEK,
  recoverableStreak: null,
  recoveryTimeRemaining: null,
};

/**
 * Get streak data from localStorage (client-side only)
 */
const getStoredStreakData = (): WinStreakData => {
  if (typeof window === 'undefined') {
    return DEFAULT_STREAK_DATA;
  }

  const currentStreak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  const bestStreak = parseInt(localStorage.getItem(BEST_STREAK_KEY) || '0', 10);
  const totalWins = parseInt(localStorage.getItem(TOTAL_WINS_KEY) || '0', 10);
  const lastWinDate = localStorage.getItem(STREAK_DATE_KEY);

  // Get streak freeze data
  let freezesAvailable = parseInt(localStorage.getItem(STREAK_FREEZES_KEY) || String(FREE_FREEZES_PER_WEEK), 10);
  const freezeLastAwarded = localStorage.getItem(FREEZE_LAST_AWARDED_KEY);

  // Award weekly free freeze if a week has passed
  if (freezeLastAwarded) {
    const lastAwardDate = new Date(freezeLastAwarded);
    if (isNewWeek(lastAwardDate)) {
      freezesAvailable = Math.min(freezesAvailable + FREE_FREEZES_PER_WEEK, 3); // Cap at 3
      localStorage.setItem(STREAK_FREEZES_KEY, freezesAvailable.toString());
      localStorage.setItem(FREEZE_LAST_AWARDED_KEY, new Date().toISOString());
    }
  } else {
    // First time - set initial freeze award date
    localStorage.setItem(FREEZE_LAST_AWARDED_KEY, new Date().toISOString());
  }

  // Check for recoverable broken streak
  const brokenStreak = parseInt(localStorage.getItem(BROKEN_STREAK_KEY) || '0', 10);
  const brokenStreakDate = localStorage.getItem(BROKEN_STREAK_DATE_KEY);
  let recoverableStreak: number | null = null;
  let recoveryTimeRemaining: number | null = null;

  if (brokenStreak > 0 && brokenStreakDate) {
    const brokenDate = new Date(brokenStreakDate);
    const now = new Date();
    const hoursSinceBroken = (now.getTime() - brokenDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceBroken < RECOVERY_WINDOW_HOURS) {
      recoverableStreak = brokenStreak;
      recoveryTimeRemaining = (RECOVERY_WINDOW_HOURS * 60 * 60 * 1000) - (now.getTime() - brokenDate.getTime());
    } else {
      // Recovery window expired - clear the broken streak data
      localStorage.removeItem(BROKEN_STREAK_KEY);
      localStorage.removeItem(BROKEN_STREAK_DATE_KEY);
    }
  }

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
      // Gap > 1 day - streak was broken (unless already saved for recovery)
      if (currentStreak > 0 && !recoverableStreak) {
        streakBroken = true;
        // Save the broken streak for potential recovery
        localStorage.setItem(BROKEN_STREAK_KEY, currentStreak.toString());
        localStorage.setItem(BROKEN_STREAK_DATE_KEY, new Date().toISOString());
        recoverableStreak = currentStreak;
        recoveryTimeRemaining = RECOVERY_WINDOW_HOURS * 60 * 60 * 1000;
      }
    }
  }

  return {
    currentStreak: streakBroken ? 0 : currentStreak,
    bestStreak,
    totalWins,
    lastWinDate,
    isStreakActive,
    streakBroken,
    freezesAvailable,
    recoverableStreak,
    recoveryTimeRemaining,
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
  // Initialize with default data to avoid hydration mismatch
  const [streakData, setStreakData] = useState<WinStreakData>(DEFAULT_STREAK_DATA);
  // Track whether data has been loaded from localStorage
  const [isLoaded, setIsLoaded] = useState(false);

  // Load streak data from localStorage after mount
  useEffect(() => {
    const data = getStoredStreakData();

    // If streak was broken, reset it
    if (data.streakBroken) {
      saveStreakData({ currentStreak: 0 });
      data.currentStreak = 0;
    }

    setStreakData(data);
    setIsLoaded(true);
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

    // Clear any recoverable streak since we just won
    localStorage.removeItem(BROKEN_STREAK_KEY);
    localStorage.removeItem(BROKEN_STREAK_DATE_KEY);

    const newData: WinStreakData = {
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      totalWins: newTotalWins,
      lastWinDate: today,
      isStreakActive: true,
      streakBroken: false,
      freezesAvailable: currentData.freezesAvailable,
      recoverableStreak: null,
      recoveryTimeRemaining: null,
    };

    saveStreakData(newData);
    setStreakData(newData);
  }, []);

  /**
   * Apply a streak freeze to protect the streak for one day
   * Returns true if freeze was successfully used
   */
  const applyStreakFreeze = useCallback((): boolean => {
    const currentData = getStoredStreakData();

    if (currentData.freezesAvailable <= 0) {
      return false;
    }

    // Use a freeze
    const newFreezes = currentData.freezesAvailable - 1;
    localStorage.setItem(STREAK_FREEZES_KEY, newFreezes.toString());

    // Extend the "last win date" to today to prevent streak break
    const today = new Date().toISOString();
    localStorage.setItem(STREAK_DATE_KEY, today);

    setStreakData(prev => ({
      ...prev,
      freezesAvailable: newFreezes,
      lastWinDate: today,
      isStreakActive: true,
    }));

    return true;
  }, []);

  /**
   * Recover a broken streak by paying coins
   * Returns true if recovery was successful
   */
  const recoverStreak = useCallback((): boolean => {
    const currentData = getStoredStreakData();

    if (!currentData.recoverableStreak || currentData.recoveryTimeRemaining === null || currentData.recoveryTimeRemaining <= 0) {
      return false;
    }

    // Restore the streak
    const restoredStreak = currentData.recoverableStreak;
    const today = new Date().toISOString();

    localStorage.setItem(STREAK_KEY, restoredStreak.toString());
    localStorage.setItem(STREAK_DATE_KEY, today);
    localStorage.removeItem(BROKEN_STREAK_KEY);
    localStorage.removeItem(BROKEN_STREAK_DATE_KEY);

    setStreakData(prev => ({
      ...prev,
      currentStreak: restoredStreak,
      lastWinDate: today,
      isStreakActive: true,
      streakBroken: false,
      recoverableStreak: null,
      recoveryTimeRemaining: null,
    }));

    return true;
  }, []);

  /**
   * Purchase additional streak freezes with coins
   * Returns true if purchase was successful
   */
  const purchaseFreeze = useCallback((count: number = 1): boolean => {
    const currentData = getStoredStreakData();

    // Cap at 5 total freezes
    const maxFreezes = 5;
    if (currentData.freezesAvailable >= maxFreezes) {
      return false;
    }

    const newFreezes = Math.min(currentData.freezesAvailable + count, maxFreezes);
    localStorage.setItem(STREAK_FREEZES_KEY, newFreezes.toString());

    setStreakData(prev => ({
      ...prev,
      freezesAvailable: newFreezes,
    }));

    return true;
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
    /** Whether localStorage data has been loaded (use to avoid race conditions) */
    isLoaded,
    recordWin,
    applyStreakFreeze,
    recoverStreak,
    purchaseFreeze,
    getStreakEmoji,
    getStreakTier,
    isStreakAtRisk: isStreakAtRisk(),
  };
};

// Default export removed - use named export instead
