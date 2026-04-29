/**
 * Coin Manager
 *
 * Handles persistent coin storage for the reveal feature.
 * Coins are earned from Daily Challenge completion and spent on word reveals.
 */

import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
  getFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/storageHelpers';
import { getStreakCoinBonusPercent } from '@/lib/streakTierRewards';
import { incrementGamesPlayed } from '@/utils/pushNotifications';

const COINS_STORAGE_KEY = 'lexiclash_coins';
const COINS_HISTORY_KEY = 'lexiclash_coins_history';

// Coin earning constants
export const COIN_EARNING = {
  DAILY_BASE: 25,           // Base coins for completing daily challenge
  EFFICIENCY_MULTIPLIER: 0.5, // Coins per efficiency point
  STREAK_BONUS: 10,         // Coins per streak day (uncapped — tiers reward long streaks)
} as const;

// Coin cost constants
export const COIN_COSTS = {
  REVEAL_5_PLUS: 60,        // Cost to reveal a 5+ letter word (balances with daily earnings)
  REVEAL_TARGET_WORD: 250,  // Cost to reveal the target word in daily challenge when failed
  DAILY_RETRY: 200,         // Cost to retry daily challenge (reduced from 500 — was 4+ sessions of earning)
  DAILY_RETRY_LEADERBOARD_PENALTY: 100, // Server-applied score deduction when a retry attempt updates the leaderboard
} as const;

// Coin reward constants for ads and bonuses
export const COIN_REWARDS = {
  WATCH_AD: 250,            // Coins earned for watching a rewarded video ad
} as const;

// Coin earning constants for other game modes
export const COIN_EARNING_OTHER = {
  SCORE_DIVISOR: 10,        // Coins = score / this value
  WIN_BONUS: 25,            // Bonus for 1st place
  TOP_3_BONUS: 10,          // Bonus for 2nd-3rd place
  MULTIPLAYER_BASE: 15,     // Base coins for multiplayer participation
  SINGLEPLAYER_BASE: 10,    // Base coins for single player completion
  MAX_GAME_REWARD: 500,     // Cap per game — prevents high Word Hunt scores from exceeding API limit
} as const;

// Bonus constants for dedicated achievement pipelines
export const FIRST_WIN_BONUS = 100;
export const WOTD_BONUS = 50;
export const GRAND_SLAM_BONUS = 200;

// Free reveals per game
export const FREE_REVEALS_PER_GAME = 2;

// Streak milestone bonus rewards (one-time per milestone)
export const STREAK_MILESTONES = [
  { days: 7, bonus: 100 },
  { days: 14, bonus: 200 },
  { days: 30, bonus: 500 },
  { days: 60, bonus: 1000 },
  { days: 100, bonus: 2500 },
] as const;

// Combo milestone coin rewards
export const COMBO_COIN_REWARDS = {
  MILESTONE_5: 5,    // Hot Streak - combo x5
  MILESTONE_10: 10,  // Unstoppable - combo x10
  MILESTONE_15: 15,  // Legendary - combo x15
  MILESTONE_20: 20,  // Every 5 levels after 15
} as const;

// Milestone levels that trigger coin rewards
export const COMBO_MILESTONES = [5, 10, 15, 20, 25, 30] as const;

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
  const balance = getJsonFromLocalStorage<CoinBalance | null>(COINS_STORAGE_KEY, null);
  return balance?.total || 0;
}

/**
 * Get full coin balance details
 */
export function getCoinBalance(): CoinBalance {
  const defaultBalance = { total: 0, earnedFromDaily: 0, spent: 0, lastUpdated: new Date().toISOString() };
  return getJsonFromLocalStorage<CoinBalance>(COINS_STORAGE_KEY, defaultBalance);
}

/**
 * Save coin balance to storage
 */
function saveCoinBalance(balance: CoinBalance): void {
  saveJsonToLocalStorage(COINS_STORAGE_KEY, balance);
}

/**
 * Add a transaction to history
 */
function addTransaction(transaction: CoinTransaction): void {
  const history = getJsonFromLocalStorage<CoinTransaction[]>(COINS_HISTORY_KEY, []);

  // Keep last 100 transactions
  history.unshift(transaction);
  if (history.length > 100) {
    history.pop();
  }

  saveJsonToLocalStorage(COINS_HISTORY_KEY, history);
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

  // Increment games-played counter so push prompt eventually shows (N-16)
  incrementGamesPlayed();

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
  streakDays: number,
  currentWinStreak?: number
): { total: number; breakdown: { base: number; efficiency: number; streak: number; streakBonus: number } } {
  if (!solved) {
    // Still give some coins for trying
    const base = Math.floor(COIN_EARNING.DAILY_BASE / 2);
    return {
      total: base,
      breakdown: { base, efficiency: 0, streak: 0, streakBonus: 0 }
    };
  }

  const base = COIN_EARNING.DAILY_BASE;
  const cappedEfficiency = Math.min(efficiencyScore, 100);
  const efficiency = Math.floor(cappedEfficiency * COIN_EARNING.EFFICIENCY_MULTIPLIER);
  const streak = Math.min(streakDays, 100) * COIN_EARNING.STREAK_BONUS;

  // Streak tier coin bonus (applied to subtotal)
  const subtotal = base + efficiency + streak;
  const streakBonus = currentWinStreak ? Math.floor(subtotal * getStreakCoinBonusPercent(currentWinStreak) / 100) : 0;

  return {
    total: subtotal + streakBonus,
    breakdown: { base, efficiency, streak, streakBonus }
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
  if (getFromLocalStorage(awardKey)) {
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
  saveToLocalStorage(awardKey, new Date().toISOString());

  return {
    awarded: reward.total,
    breakdown: reward.breakdown,
  };
}

/**
 * Get transaction history
 */
export function getCoinHistory(): CoinTransaction[] {
  return getJsonFromLocalStorage<CoinTransaction[]>(COINS_HISTORY_KEY, []);
}

/**
 * Calculate coins earned from a game (single player or multiplayer)
 */
export function calculateGameReward(
  score: number,
  mode: 'singleplayer' | 'multiplayer',
  rank?: number,
  totalPlayers?: number,
  currentStreak?: number
): { total: number; breakdown: { base: number; scoreBonus: number; placement: number; streakBonus: number } } {
  // Base coins for completing the game (only if player scored points)
  const base = score > 0
    ? (mode === 'multiplayer'
        ? COIN_EARNING_OTHER.MULTIPLAYER_BASE
        : COIN_EARNING_OTHER.SINGLEPLAYER_BASE)
    : 0;

  // Score-based bonus
  const scoreBonus = Math.floor(score / COIN_EARNING_OTHER.SCORE_DIVISOR);

  // Placement bonus (only for competitive modes with rankings)
  let placement = 0;
  if (rank !== undefined && totalPlayers !== undefined && totalPlayers > 1) {
    if (rank === 1) {
      placement = COIN_EARNING_OTHER.WIN_BONUS;
    } else if (rank <= 3) {
      placement = COIN_EARNING_OTHER.TOP_3_BONUS;
    }
  }

  // Streak tier coin bonus (applied to subtotal)
  const subtotal = base + scoreBonus + placement;
  const streakBonus = currentStreak ? Math.floor(subtotal * getStreakCoinBonusPercent(currentStreak) / 100) : 0;

  const total = Math.min(subtotal + streakBonus, COIN_EARNING_OTHER.MAX_GAME_REWARD);

  return {
    total,
    breakdown: { base, scoreBonus, placement, streakBonus }
  };
}

/**
 * Award coins for game completion (single player or multiplayer)
 * Returns null if already awarded for this session, or the reward if successful
 */
export function awardGameCoins(
  sessionId: string,
  mode: 'singleplayer' | 'multiplayer',
  score: number,
  rank?: number,
  totalPlayers?: number,
  currentStreak?: number
): { awarded: number; breakdown: { base: number; scoreBonus: number; placement: number; streakBonus: number } } | null {
  if (typeof window === 'undefined') return null;

  // Check if already awarded for this session
  const awardKey = `lexiclash_game_coin_award_${sessionId}`;
  if (getFromLocalStorage(awardKey)) {
    return null; // Already awarded
  }

  const reward = calculateGameReward(score, mode, rank, totalPlayers, currentStreak);

  // Don't award if reward is 0
  if (reward.total <= 0) {
    return null;
  }

  // Add coins with appropriate reason
  const reason = mode === 'multiplayer' ? 'Multiplayer Game' : 'Single Player Game';
  addCoins(reward.total, reason, {
    sessionId,
    score,
    rank: rank ?? 0,
    totalPlayers: totalPlayers ?? 1,
  });

  // Mark as awarded
  saveToLocalStorage(awardKey, new Date().toISOString());

  return {
    awarded: reward.total,
    breakdown: reward.breakdown,
  };
}

/**
 * Calculate coins earned from a combo milestone
 */
export function calculateComboMilestoneReward(comboLevel: number): number {
  if (comboLevel >= 20) {
    return COMBO_COIN_REWARDS.MILESTONE_20;
  } else if (comboLevel >= 15) {
    return COMBO_COIN_REWARDS.MILESTONE_15;
  } else if (comboLevel >= 10) {
    return COMBO_COIN_REWARDS.MILESTONE_10;
  } else if (comboLevel >= 5) {
    return COMBO_COIN_REWARDS.MILESTONE_5;
  }
  return 0;
}

/**
 * Check if a combo level is a milestone that awards coins
 */
export function isComboMilestone(comboLevel: number): boolean {
  return COMBO_MILESTONES.includes(comboLevel as typeof COMBO_MILESTONES[number]);
}

/**
 * Award coins for reaching a combo milestone
 * Returns the amount awarded, or 0 if not a milestone
 */
export function awardComboCoins(comboLevel: number, gameMode: string): number {
  if (!isComboMilestone(comboLevel)) {
    return 0;
  }

  const reward = calculateComboMilestoneReward(comboLevel);
  if (reward <= 0) return 0;

  addCoins(reward, 'Combo Milestone', {
    comboLevel,
    gameMode,
  });

  return reward;
}

/**
 * Apply streak tier coin bonus to a base amount.
 * Returns the bonus amount (not the total).
 */
export function applyStreakCoinBonus(baseAmount: number, currentStreak: number): number {
  const bonusPercent = getStreakCoinBonusPercent(currentStreak);
  if (bonusPercent <= 0) return 0;
  return Math.floor(baseAmount * bonusPercent / 100);
}
