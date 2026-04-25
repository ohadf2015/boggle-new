/**
 * Streak Freeze Integration
 * Consumes a freeze to protect streak when a day is missed
 */

import type { DailyStreak } from './types';
import { DAILY_STREAK_KEY } from './constants';
import { getDailyChallengeDate, getPreviousDate } from './dateUtils';
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import { emitStreakLifecycle, type StreakOutcome } from './streakTelemetry';
import { getStreakMilestone } from './streaks';

export const STREAK_FREEZE_KEY = 'lexiclash_streak_freezes';
const MAX_FREEZES = 3;

interface StreakFreezeData {
  count: number;
}

function getFreezeCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STREAK_FREEZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Math.min(parsed.count ?? 0, MAX_FREEZES);
    }
  } catch {
    // ignore
  }
  return 0;
}

function consumeFreezeFromStorage(): boolean {
  const count = getFreezeCount();
  if (count <= 0) return false;
  localStorage.setItem(STREAK_FREEZE_KEY, JSON.stringify({ count: count - 1 }));
  return true;
}

export interface StreakWithFreezeResult {
  streak: DailyStreak;
  freezeUsed: boolean;
}

/**
 * Update daily streak with freeze protection.
 * If the player missed exactly one day and has a freeze, consume it and continue the streak.
 */
export function updateDailyStreakWithFreeze(completionDate?: string): StreakWithFreezeResult {
  if (typeof window === 'undefined') {
    return {
      streak: { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 },
      freezeUsed: false,
    };
  }

  const today = completionDate || getDailyChallengeDate();
  const previousDay = getPreviousDate(today);
  const twoDaysAgo = getPreviousDate(previousDay);
  const defaultStreak: DailyStreak = { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  const current = getJsonFromLocalStorage<DailyStreak>(DAILY_STREAK_KEY, defaultStreak);

  // Already played today
  if (current.lastPlayedDate === today) {
    return { streak: current, freezeUsed: false };
  }

  let newStreak: number;
  let freezeUsed = false;
  let outcome: StreakOutcome;

  if (current.lastPlayedDate === previousDay) {
    newStreak = current.currentStreak + 1;
    outcome = 'continued';
  } else if (current.lastPlayedDate === twoDaysAgo && consumeFreezeFromStorage()) {
    newStreak = current.currentStreak + 1;
    freezeUsed = true;
    outcome = 'continued';
  } else if (current.currentStreak > 0) {
    newStreak = 1;
    outcome = 'broken';
  } else {
    newStreak = 1;
    outcome = 'started';
  }

  const updated: DailyStreak = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, current.longestStreak),
    lastPlayedDate: today,
    totalDailiesCompleted: current.totalDailiesCompleted + 1,
  };

  saveJsonToLocalStorage(DAILY_STREAK_KEY, updated);
  emitStreakLifecycle({
    outcome,
    newStreak,
    milestone: getStreakMilestone(newStreak),
    freezeUsed,
  });

  return { streak: updated, freezeUsed };
}

/**
 * Earn a streak freeze (called after completing 3+ games in a day)
 */
export function earnStreakFreeze(): number {
  const count = getFreezeCount();
  if (count >= MAX_FREEZES) return count;
  const newCount = count + 1;
  localStorage.setItem(STREAK_FREEZE_KEY, JSON.stringify({ count: newCount }));
  return newCount;
}

export { getFreezeCount, MAX_FREEZES };
