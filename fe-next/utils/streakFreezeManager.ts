/**
 * Streak Freeze Manager
 *
 * Allows players to protect their daily streak for 1 missed day.
 * Limited to 1 use per 7 days to prevent abuse.
 * Costs 100 coins to activate.
 */

import logger from '@/utils/logger';
import { spendCoins, canAfford, COIN_COSTS } from '@/utils/coinManager';

const STREAK_FREEZE_KEY = 'lexiclash_streak_freeze';
const FREEZE_COOLDOWN_DAYS = 7;

export interface StreakFreezeState {
  lastUsed: string | null; // ISO date string
  activeFreezeDate: string | null; // The date being protected by the freeze
  usesAllTime: number;
}

/**
 * Get the current streak freeze state
 */
export function getStreakFreezeState(): StreakFreezeState {
  if (typeof window === 'undefined') {
    return { lastUsed: null, activeFreezeDate: null, usesAllTime: 0 };
  }

  try {
    const stored = localStorage.getItem(STREAK_FREEZE_KEY);
    if (!stored) {
      return { lastUsed: null, activeFreezeDate: null, usesAllTime: 0 };
    }
    return JSON.parse(stored);
  } catch (error) {
    logger.error('Error reading streak freeze state:', error);
    return { lastUsed: null, activeFreezeDate: null, usesAllTime: 0 };
  }
}

/**
 * Save the streak freeze state
 */
function saveStreakFreezeState(state: StreakFreezeState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STREAK_FREEZE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Error saving streak freeze state:', error);
  }
}

/**
 * Check if streak freeze is available (not on cooldown)
 */
export function isStreakFreezeAvailable(): boolean {
  const state = getStreakFreezeState();

  if (!state.lastUsed) {
    return true; // Never used before
  }

  const lastUsedDate = new Date(state.lastUsed);
  const now = new Date();
  const daysSinceLastUse = Math.floor(
    (now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastUse >= FREEZE_COOLDOWN_DAYS;
}

/**
 * Get days remaining until streak freeze is available
 */
export function getDaysUntilFreezeAvailable(): number {
  const state = getStreakFreezeState();

  if (!state.lastUsed) {
    return 0;
  }

  const lastUsedDate = new Date(state.lastUsed);
  const now = new Date();
  const daysSinceLastUse = Math.floor(
    (now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, FREEZE_COOLDOWN_DAYS - daysSinceLastUse);
}

/**
 * Check if player can afford streak freeze
 */
export function canAffordStreakFreeze(): boolean {
  return canAfford(COIN_COSTS.STREAK_FREEZE);
}

/**
 * Activate streak freeze for a specific date
 * Returns true if successful, false otherwise
 */
export function activateStreakFreeze(dateToProtect: string): boolean {
  // Check availability
  if (!isStreakFreezeAvailable()) {
    logger.warn('Streak freeze not available - still on cooldown');
    return false;
  }

  // Check affordability and spend coins
  if (!spendCoins(COIN_COSTS.STREAK_FREEZE, 'Streak Freeze', { dateProtected: dateToProtect })) {
    logger.warn('Cannot afford streak freeze');
    return false;
  }

  // Update state
  const state = getStreakFreezeState();
  state.lastUsed = new Date().toISOString();
  state.activeFreezeDate = dateToProtect;
  state.usesAllTime = (state.usesAllTime || 0) + 1;

  saveStreakFreezeState(state);

  logger.info(`Streak freeze activated for date: ${dateToProtect}`);
  return true;
}

/**
 * Check if a specific date is protected by an active freeze
 */
export function isDateProtectedByFreeze(date: string): boolean {
  const state = getStreakFreezeState();
  return state.activeFreezeDate === date;
}

/**
 * Clear the active freeze (called after the freeze is "used up")
 */
export function clearActiveFreeze(): void {
  const state = getStreakFreezeState();
  state.activeFreezeDate = null;
  saveStreakFreezeState(state);
}

/**
 * Get streak freeze status summary for UI display
 */
export function getStreakFreezeStatus(): {
  available: boolean;
  affordable: boolean;
  daysUntilAvailable: number;
  cost: number;
  totalUsesAllTime: number;
  activeFreezeDate: string | null;
} {
  const state = getStreakFreezeState();

  return {
    available: isStreakFreezeAvailable(),
    affordable: canAffordStreakFreeze(),
    daysUntilAvailable: getDaysUntilFreezeAvailable(),
    cost: COIN_COSTS.STREAK_FREEZE,
    totalUsesAllTime: state.usesAllTime || 0,
    activeFreezeDate: state.activeFreezeDate,
  };
}

/**
 * Check if streak should be preserved considering freeze
 * This integrates with the streak calculation logic
 * @param lastPlayDate - The date of the last play (ISO string, date only)
 * @param currentDate - The current date (ISO string, date only)
 * @returns true if streak should be preserved (either consecutive or frozen)
 */
export function shouldPreserveStreak(lastPlayDate: string, currentDate: string): boolean {
  // Parse dates (assuming YYYY-MM-DD format)
  const last = new Date(lastPlayDate);
  const current = new Date(currentDate);

  // Calculate days between
  const daysDiff = Math.floor(
    (current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Consecutive days - streak naturally continues
  if (daysDiff <= 1) {
    return true;
  }

  // Exactly 2 days difference - check if yesterday is frozen
  if (daysDiff === 2) {
    const yesterday = new Date(current);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (isDateProtectedByFreeze(yesterdayStr)) {
      // Clear the freeze as it's been used
      clearActiveFreeze();
      logger.info(`Streak preserved using freeze for date: ${yesterdayStr}`);
      return true;
    }
  }

  // Gap too large or no freeze - streak broken
  return false;
}
