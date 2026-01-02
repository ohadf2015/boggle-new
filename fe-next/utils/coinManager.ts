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
  REVEAL_5_PLUS: 60,        // Cost to reveal a 5+ letter word (balances with daily earnings)
  REVEAL_TARGET_WORD: 150,  // Cost to reveal the target word in daily challenge when failed (reduced from 250)
  DAILY_RETRY: 200,         // Cost to retry daily challenge (reduced from 500 for accessibility)
  STREAK_FREEZE: 100,       // Cost to protect daily streak for 1 missed day (limited to 1/week)
} as const;

// Coin earning constants for other game modes
export const COIN_EARNING_OTHER = {
  SCORE_DIVISOR: 10,        // Coins = score / this value
  WIN_BONUS: 25,            // Bonus for 1st place
  TOP_3_BONUS: 10,          // Bonus for 2nd-3rd place
  MULTIPLAYER_BASE: 15,     // Base coins for multiplayer participation
  SINGLEPLAYER_BASE: 10,    // Base coins for single player completion
} as const;

// Free reveals per game
export const FREE_REVEALS_PER_GAME = 2;

// Combo milestone coin rewards
export const COMBO_COIN_REWARDS = {
  MILESTONE_5: 5,    // Hot Streak - combo x5
  MILESTONE_10: 10,  // Unstoppable - combo x10
  MILESTONE_15: 15,  // Legendary - combo x15
  MILESTONE_20: 20,  // Every 5 levels after 15
} as const;

// Milestone levels that trigger coin rewards
export const COMBO_MILESTONES = [5, 10, 15, 20, 25, 30] as const;

// Maximum combo coins per game to prevent inflation
export const MAX_COMBO_COINS_PER_GAME = 30;

// Storage key for tracking combo coins per session
const COMBO_COINS_SESSION_KEY = 'lexiclash_combo_coins_session';

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

/**
 * Calculate coins earned from a game (single player or multiplayer)
 */
export function calculateGameReward(
  score: number,
  mode: 'singleplayer' | 'multiplayer',
  rank?: number,
  totalPlayers?: number
): { total: number; breakdown: { base: number; scoreBonus: number; placement: number } } {
  // Base coins for completing the game
  const base = mode === 'multiplayer'
    ? COIN_EARNING_OTHER.MULTIPLAYER_BASE
    : COIN_EARNING_OTHER.SINGLEPLAYER_BASE;

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

  return {
    total: base + scoreBonus + placement,
    breakdown: { base, scoreBonus, placement }
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
  totalPlayers?: number
): { awarded: number; breakdown: { base: number; scoreBonus: number; placement: number } } | null {
  if (typeof window === 'undefined') return null;

  // Check if already awarded for this session
  const awardKey = `lexiclash_game_coin_award_${sessionId}`;
  if (localStorage.getItem(awardKey)) {
    return null; // Already awarded
  }

  const reward = calculateGameReward(score, mode, rank, totalPlayers);

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
  localStorage.setItem(awardKey, new Date().toISOString());

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
 * Get current combo coins earned in a session
 */
function getSessionComboCoinTotal(sessionId: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(`${COMBO_COINS_SESSION_KEY}_${sessionId}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Update combo coins earned in a session
 */
function setSessionComboCoinTotal(sessionId: string, total: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`${COMBO_COINS_SESSION_KEY}_${sessionId}`, total.toString());
  } catch (error) {
    logger.error('Error saving session combo coins:', error);
  }
}

/**
 * Award coins for reaching a combo milestone
 * Returns the amount awarded, or 0 if not a milestone or cap reached
 * @param comboLevel - The combo level reached
 * @param gameMode - The game mode (singleplayer, multiplayer, daily)
 * @param sessionId - The game session ID for tracking per-game caps
 */
export function awardComboCoins(comboLevel: number, gameMode: string, sessionId?: string): number {
  if (!isComboMilestone(comboLevel)) {
    return 0;
  }

  const reward = calculateComboMilestoneReward(comboLevel);
  if (reward <= 0) return 0;

  // If sessionId provided, enforce per-game cap
  if (sessionId) {
    const currentSessionTotal = getSessionComboCoinTotal(sessionId);

    // Check if we've already hit the cap
    if (currentSessionTotal >= MAX_COMBO_COINS_PER_GAME) {
      logger.debug(`Combo coin cap reached for session ${sessionId}: ${currentSessionTotal}/${MAX_COMBO_COINS_PER_GAME}`);
      return 0;
    }

    // Calculate how much we can actually award (might be partial if near cap)
    const remainingAllowance = MAX_COMBO_COINS_PER_GAME - currentSessionTotal;
    const actualReward = Math.min(reward, remainingAllowance);

    if (actualReward <= 0) return 0;

    // Update session tracking
    setSessionComboCoinTotal(sessionId, currentSessionTotal + actualReward);

    addCoins(actualReward, 'Combo Milestone', {
      comboLevel,
      gameMode,
      sessionId,
      capped: actualReward < reward ? 1 : 0,
    });

    return actualReward;
  }

  // Legacy behavior without session tracking (backward compatible)
  addCoins(reward, 'Combo Milestone', {
    comboLevel,
    gameMode,
  });

  return reward;
}

/**
 * Get remaining combo coins allowed for a session
 */
export function getRemainingComboCoinAllowance(sessionId: string): number {
  const currentTotal = getSessionComboCoinTotal(sessionId);
  return Math.max(0, MAX_COMBO_COINS_PER_GAME - currentTotal);
}

/**
 * Check if combo coin cap has been reached for a session
 */
export function isComboCoinCapReached(sessionId: string): boolean {
  return getSessionComboCoinTotal(sessionId) >= MAX_COMBO_COINS_PER_GAME;
}
