/**
 * Daily Challenge Streak Utilities
 *
 * Streak tracking and milestone calculations
 */

import type { DailyStreak } from './types';
import { DAILY_STREAK_KEY } from './constants';
import { getDailyChallengeDate, getYesterdayDate, getPreviousDate } from './dateUtils';
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import { emitStreakLifecycle } from './streakTelemetry';

/**
 * Get the current daily streak
 */
export function getDailyStreak(): DailyStreak {
  const defaultStreak = { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  return getJsonFromLocalStorage<DailyStreak>(DAILY_STREAK_KEY, defaultStreak);
}

/**
 * Update the daily streak after completing a daily challenge
 */
export function updateDailyStreak(completionDate?: string): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const today = completionDate || getDailyChallengeDate();
  const previousDay = getPreviousDate(today);
  const current = getDailyStreak();

  // Already played today - no update needed
  if (current.lastPlayedDate === today) {
    return current;
  }

  let newStreak: number;
  let outcome: 'continued' | 'broken' | 'started';

  if (current.lastPlayedDate === previousDay) {
    newStreak = current.currentStreak + 1;
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
  emitStreakLifecycle({ outcome, newStreak, milestone: getStreakMilestone(newStreak) });

  return updated;
}

/**
 * Check if this streak update hits a milestone
 */
export function getStreakMilestone(streak: number): number | null {
  const milestones = [7, 14, 30, 50, 100, 365];
  return milestones.find(m => m === streak) || null;
}

/**
 * Milestones that still earn a full-screen confetti modal.
 *
 * Deliberately narrower than the tracked list above: a modal that interrupts the
 * results screen to congratulate a player on turning up seven days running is
 * celebrating attendance, and doing it twice in a fortnight is what made the
 * streak read as an obligation. The remaining three are rare enough to be worth
 * stopping for. Everything below them still counts, still pays out, and still
 * reports — it just no longer takes over the screen.
 */
export const CELEBRATED_STREAK_MILESTONES = [30, 100, 365] as const;

export function shouldCelebrateStreakMilestone(streak: number): boolean {
  return (CELEBRATED_STREAK_MILESTONES as readonly number[]).includes(streak);
}

/**
 * Check if the player's streak is at risk (hasn't played today but has an active streak)
 * Returns the hours remaining until streak expires, or null if no active streak at risk
 */
export function isStreakAtRisk(): { atRisk: boolean; hoursRemaining: number; currentStreak: number } {
  if (typeof window === 'undefined') {
    return { atRisk: false, hoursRemaining: 0, currentStreak: 0 };
  }

  const streak = getDailyStreak();
  const today = getDailyChallengeDate();

  // No streak or already played today - not at risk
  if (streak.currentStreak < 2 || streak.lastPlayedDate === today) {
    return { atRisk: false, hoursRemaining: 0, currentStreak: streak.currentStreak };
  }

  // Check if they played yesterday (streak is still valid but at risk today)
  const yesterdayStr = getYesterdayDate();

  if (streak.lastPlayedDate === yesterdayStr) {
    // Calculate hours until midnight UTC (when streak expires)
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const hoursRemaining = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60)));

    return { atRisk: true, hoursRemaining, currentStreak: streak.currentStreak };
  }

  // Streak already broken (missed yesterday)
  return { atRisk: false, hoursRemaining: 0, currentStreak: 0 };
}

/**
 * Get a celebratory message for streak milestones
 */
export function getStreakMilestoneMessage(streak: number): { emoji: string; title: string; subtitle: string } | null {
  const milestoneMessages: Record<number, { emoji: string; title: string; subtitle: string }> = {
    7: { emoji: '🔥', title: '1 WEEK STREAK!', subtitle: 'A full week of word hunting!' },
    14: { emoji: '🌟', title: '2 WEEKS STRONG!', subtitle: 'Two weeks of dedication!' },
    30: { emoji: '👑', title: 'MONTHLY MASTER!', subtitle: '30 days of excellence!' },
    50: { emoji: '💎', title: 'LEGENDARY STREAK!', subtitle: '50 days unstoppable!' },
    100: { emoji: '🏆', title: 'CENTURY CHAMPION!', subtitle: '100 days - you are a legend!' },
    365: { emoji: '🌍', title: 'YEAR-LONG WARRIOR!', subtitle: '365 days of pure dedication!' },
  };
  return milestoneMessages[streak] || null;
}
