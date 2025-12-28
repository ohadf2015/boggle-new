/**
 * Coin Manager
 *
 * Handles persistent coin storage for the reveal feature.
 * Coins are earned from Daily Challenge completion and spent on word reveals.
 */

import logger from '@/utils/logger';

const COINS_STORAGE_KEY = 'lexiclash_coins';
const COINS_HISTORY_KEY = 'lexiclash_coins_history';

// Coin earning constants
export const COIN_EARNING = {
  DAILY_BASE: 25,           // Base coins for completing daily challenge
  EFFICIENCY_MULTIPLIER: 0.5, // Coins per efficiency point
  STREAK_BONUS: 10,         // Coins per streak day
  MAX_STREAK_BONUS_DAYS: 7, // Cap streak bonus at 7 days
} as const;

// Coin cost constants
export const COIN_COSTS = {
  REVEAL_5_PLUS: 15,        // Cost to reveal a 5+ letter word
} as const;

// Free reveals per game
export const FREE_REVEALS_PER_GAME = 2;

export interface CoinBalance {
  total: number;
  earnedFromDaily: number;
  spent: number;
  lastUpdated: string;
}

export interface CoinTransaction {
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  timestamp: string;
  details?: Record<string, number | string>;
}

/**
 * Get current coin balance
 */
export function getCoins(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(COINS_STORAGE_KEY);
    if (!stored) return 0;

    const balance: CoinBalance = JSON.parse(stored);
    return balance.total || 0;
  } catch (error) {
    logger.error('Error reading coins:', error);
    return 0;
  }
}

/**
 * Get full coin balance details
 */
export function getCoinBalance(): CoinBalance {
  if (typeof window === 'undefined') {
    return { total: 0, earnedFromDaily: 0, spent: 0, lastUpdated: new Date().toISOString() };
  }

  try {
    const stored = localStorage.getItem(COINS_STORAGE_KEY);
    if (!stored) {
      return { total: 0, earnedFromDaily: 0, spent: 0, lastUpdated: new Date().toISOString() };
    }

    return JSON.parse(stored);
  } catch (error) {
    logger.error('Error reading coin balance:', error);
    return { total: 0, earnedFromDaily: 0, spent: 0, lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save coin balance to storage
 */
function saveCoinBalance(balance: CoinBalance): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(balance));
  } catch (error) {
    logger.error('Error saving coin balance:', error);
  }
}

/**
 * Add a transaction to history
 */
function addTransaction(transaction: CoinTransaction): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(COINS_HISTORY_KEY);
    const history: CoinTransaction[] = stored ? JSON.parse(stored) : [];

    // Keep last 100 transactions
    history.unshift(transaction);
    if (history.length > 100) {
      history.pop();
    }

    localStorage.setItem(COINS_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    logger.error('Error saving coin transaction:', error);
  }
}

/**
 * Add coins to balance
 */
export function addCoins(amount: number, reason: string, details?: Record<string, number | string>): number {
  if (typeof window === 'undefined' || amount <= 0) return 0;

  const balance = getCoinBalance();
  balance.total += amount;
  balance.earnedFromDaily += amount;
  balance.lastUpdated = new Date().toISOString();

  saveCoinBalance(balance);

  addTransaction({
    type: 'earn',
    amount,
    reason,
    timestamp: new Date().toISOString(),
    details,
  });

  return balance.total;
}

/**
 * Spend coins from balance
 * Returns true if successful, false if insufficient balance
 */
export function spendCoins(amount: number, reason: string, details?: Record<string, number | string>): boolean {
  if (typeof window === 'undefined' || amount <= 0) return false;

  const balance = getCoinBalance();

  if (balance.total < amount) {
    return false; // Insufficient balance
  }

  balance.total -= amount;
  balance.spent += amount;
  balance.lastUpdated = new Date().toISOString();

  saveCoinBalance(balance);

  addTransaction({
    type: 'spend',
    amount,
    reason,
    timestamp: new Date().toISOString(),
    details,
  });

  return true;
}

/**
 * Check if user can afford a purchase
 */
export function canAfford(amount: number): boolean {
  return getCoins() >= amount;
}

/**
 * Calculate coins earned from Daily Challenge completion
 */
export function calculateDailyReward(
  solved: boolean,
  efficiencyScore: number,
  streakDays: number
): { total: number; breakdown: { base: number; efficiency: number; streak: number } } {
  if (!solved) {
    // Still give some coins for trying
    const base = Math.floor(COIN_EARNING.DAILY_BASE / 2);
    return {
      total: base,
      breakdown: { base, efficiency: 0, streak: 0 }
    };
  }

  const base = COIN_EARNING.DAILY_BASE;
  const efficiency = Math.floor(efficiencyScore * COIN_EARNING.EFFICIENCY_MULTIPLIER);
  const cappedStreakDays = Math.min(streakDays, COIN_EARNING.MAX_STREAK_BONUS_DAYS);
  const streak = cappedStreakDays * COIN_EARNING.STREAK_BONUS;

  return {
    total: base + efficiency + streak,
    breakdown: { base, efficiency, streak }
  };
}

/**
 * Award coins for Daily Challenge completion
 * Should be called once per daily puzzle completion
 */
export function awardDailyCoins(
  puzzleDate: string,
  language: string,
  solved: boolean,
  efficiencyScore: number,
  streakDays: number
): { awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null {
  if (typeof window === 'undefined') return null;

  // Check if already awarded for this puzzle
  const awardKey = `lexiclash_daily_coin_award_${puzzleDate}_${language}`;
  if (localStorage.getItem(awardKey)) {
    return null; // Already awarded
  }

  const reward = calculateDailyReward(solved, efficiencyScore, streakDays);

  addCoins(reward.total, 'Daily Challenge', {
    puzzleDate,
    language,
    solved: solved ? 'yes' : 'no',
    efficiencyScore,
    streakDays,
  });

  // Mark as awarded
  localStorage.setItem(awardKey, new Date().toISOString());

  return {
    awarded: reward.total,
    breakdown: reward.breakdown,
  };
}

/**
 * Get transaction history
 */
export function getCoinHistory(): CoinTransaction[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(COINS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error('Error reading coin history:', error);
    return [];
  }
}
