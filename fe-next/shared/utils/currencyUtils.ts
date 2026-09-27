/**
 * Currency Utilities
 *
 * Handles gold calculations, upgrade costs, and purchase logic for the
 * meta-progression system. Players earn gold from adventure levels and
 * spend it on permanent stat upgrades.
 *
 * Economic Design:
 * - Gold scales exponentially with level (base * 1.2^level)
 * - Upgrade costs scale exponentially (baseCost * 1.5^stacks)
 * - Requires multiple level completions to afford upgrades
 * - Prevents currency inflation at high levels
 */

import type {
  UpgradeId,
  StatUpgrade,
  PurchaseResult,
  DifficultyLevel,
  StarRating,
} from '../types/progression';

/**
 * Currency configuration constants
 */
export const CURRENCY_CONFIG = {
  /** Base gold reward for level 1 */
  baseGoldReward: 50,
  /** Exponential growth rate per level (1.2 = +20% per level) */
  goldGrowthRate: 1.2,
  /** Difficulty multipliers for gold rewards */
  difficultyMultipliers: {
    easy: 0.8,
    normal: 1.0,
    hard: 1.5,
  },
  /** Bonus percentage per star (10 = +10% per star) */
  starBonusPercentage: 10,
  /** Exponential growth rate for upgrade costs (1.5 = +50% per stack) */
  upgradeCostGrowthRate: 1.5,
} as const;

/**
 * Stat upgrade definitions
 */
export const STAT_UPGRADES: Record<UpgradeId, StatUpgrade> = {
  timeBonus: {
    id: 'timeBonus',
    name: 'Time Bonus',
    description: 'Gain +10% more time on all levels',
    baseCost: 500,
    benefitPerStack: 10,
    maxStacks: 5,
    icon: 'clock',
  },
  scoreBonus: {
    id: 'scoreBonus',
    name: 'Score Bonus',
    description: 'Gain +5% more score on all levels',
    baseCost: 750,
    benefitPerStack: 5,
    maxStacks: 5,
    icon: 'star',
  },
  xpBonus: {
    id: 'xpBonus',
    name: 'XP Bonus',
    description: 'Gain +10% more XP on all levels',
    baseCost: 1000,
    benefitPerStack: 10,
    maxStacks: 5,
    icon: 'lightning',
  },
} as const;

/**
 * Calculate gold reward for completing an adventure level.
 *
 * Formula:
 * 1. Base: baseGoldReward * growthRate^level
 * 2. Apply difficulty multiplier
 * 3. Apply star bonus: result * (1 + stars * starBonusPercentage / 100)
 *
 * @param level - Level number (1-based)
 * @param difficulty - Difficulty level (easy, normal, hard)
 * @param stars - Star rating (1-3)
 * @returns Gold reward amount (rounded to nearest integer)
 *
 * @example
 * calculateLevelGold(1, 'normal', 3) // 78 gold
 * calculateLevelGold(10, 'hard', 2) // ~409 gold
 */
export function calculateLevelGold(
  level: number,
  difficulty: DifficultyLevel,
  stars: StarRating
): number {
  const { baseGoldReward, goldGrowthRate, difficultyMultipliers, starBonusPercentage } =
    CURRENCY_CONFIG;

  // Calculate base gold with exponential growth
  const baseGold = baseGoldReward * Math.pow(goldGrowthRate, level);

  // Apply difficulty multiplier
  const withDifficulty = baseGold * difficultyMultipliers[difficulty];

  // Apply star bonus (each star adds starBonusPercentage)
  const starMultiplier = 1 + (stars * starBonusPercentage) / 100;
  const finalGold = withDifficulty * starMultiplier;

  // Round to nearest integer
  return Math.round(finalGold);
}

/**
 * Calculate the cost of purchasing an upgrade at a specific stack level.
 *
 * Formula: baseCost * growthRate^currentStacks
 *
 * @param upgradeId - ID of the upgrade
 * @param currentStacks - Current number of stacks owned (0-4)
 * @returns Cost in gold (rounded to nearest integer)
 *
 * @example
 * getUpgradeCost('timeBonus', 0) // 500 (first purchase)
 * getUpgradeCost('timeBonus', 1) // 750 (second purchase)
 * getUpgradeCost('timeBonus', 2) // 1125 (third purchase)
 */
export function getUpgradeCost(upgradeId: UpgradeId, currentStacks: number): number {
  const upgrade = STAT_UPGRADES[upgradeId];
  if (!upgrade) {
    throw new Error(`Invalid upgrade ID: ${upgradeId}`);
  }

  const { baseCost } = upgrade;
  const { upgradeCostGrowthRate } = CURRENCY_CONFIG;

  // Calculate exponential cost
  const cost = baseCost * Math.pow(upgradeCostGrowthRate, currentStacks);

  // Round to nearest integer
  return Math.round(cost);
}

/**
 * Attempt to purchase an upgrade.
 *
 * Validates:
 * - Upgrade exists
 * - Player has sufficient gold
 * - Player hasn't reached max stacks
 *
 * Pure function - does not mutate inputs.
 *
 * @param upgradeId - ID of the upgrade to purchase
 * @param currentGold - Player's current gold balance
 * @param currentStacks - Current number of stacks owned for this upgrade
 * @returns Purchase result (success or failure with reason)
 *
 * @example
 * purchaseUpgrade('timeBonus', 1000, 0)
 * // { success: true, newGold: 500, newStacks: 1 }
 *
 * purchaseUpgrade('timeBonus', 400, 0)
 * // { success: false, error: 'insufficient_gold' }
 *
 * purchaseUpgrade('timeBonus', 10000, 5)
 * // { success: false, error: 'max_stacks_reached' }
 */
export function purchaseUpgrade(
  upgradeId: UpgradeId,
  currentGold: number,
  currentStacks: number
): PurchaseResult {
  // Validate upgrade exists
  const upgrade = STAT_UPGRADES[upgradeId];
  if (!upgrade) {
    return { success: false, error: 'invalid_upgrade' };
  }

  // Check max stacks
  if (currentStacks >= upgrade.maxStacks) {
    return { success: false, error: 'max_stacks_reached' };
  }

  // Calculate cost
  const cost = getUpgradeCost(upgradeId, currentStacks);

  // Check sufficient gold
  if (currentGold < cost) {
    return { success: false, error: 'insufficient_gold' };
  }

  // Purchase successful
  return {
    success: true,
    newGold: currentGold - cost,
    newStacks: currentStacks + 1,
  };
}
