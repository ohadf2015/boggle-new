/**
 * Streak Wager Calculator
 * Handles wager payout calculations, max wager limits, and availability checks
 */

const WAGER_MULTIPLIER = 3;
const MAX_WAGER_AMOUNT = 100;
const MIN_STREAK_FOR_WAGER = 2;

export function calculateWagerPayout(wagerAmount: number, won: boolean): number {
  if (!won) return 0;
  return wagerAmount * WAGER_MULTIPLIER;
}

export function getMaxWager(currentCoins: number): number {
  return Math.min(currentCoins, MAX_WAGER_AMOUNT);
}

export function isWagerAvailable(currentStreak: number): boolean {
  return currentStreak >= MIN_STREAK_FOR_WAGER;
}
