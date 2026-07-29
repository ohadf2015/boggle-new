/**
 * Adventure XP Utilities
 *
 * Calculates XP progression for Adventure Mode using an exponential curve
 * inspired by RuneScape's leveling formula.
 *
 * Formula: XP per level = floor(i + 300 * 2^(i/12)) / 4
 * Max level: 50 (soft cap with linear progression after)
 */

// ==================== Constants ====================

export const ADVENTURE_XP_CONFIG = {
  MAX_LEVEL: 50,

  // Base XP rewards by difficulty
  DIFFICULTY_XP: {
    easy: 30,
    medium: 50,
    hard: 80,
  },

  // Bonus multipliers
  COMBO_MULTIPLIER: 0.1, // +10% per combo level above 1
  PERFECT_CLEAR_BONUS: 0.25, // +25% for perfect clear

  // World scaling: XP multiplier per world (1.0x for W1, increasing)
  WORLD_XP_MULTIPLIER: 0.35, // +35% per world above 1

  // Exponential curve divisor — controls how steeply XP-to-level grows
  // Lower = steeper (RuneScape uses 7). 12 fits a 70-level adventure mode.
  CURVE_DIVISOR: 12,
} as const;

// ==================== Types ====================

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AdventureXpConfig {
  MAX_LEVEL: number;
  DIFFICULTY_XP: Record<Difficulty, number>;
  COMBO_MULTIPLIER: number;
  PERFECT_CLEAR_BONUS: number;
}

export interface AdventureXpProgress {
  currentLevel: number;
  progressPercent: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  isMaxLevel: boolean;
}

export interface LevelUpCheck {
  leveledUp: boolean;
  newLevel?: number;
}

export interface AdventureXpBonuses {
  perfectClear?: boolean;
  timeBonus?: number;
  /** World number (1-10) for world-based XP scaling */
  worldId?: number;
}

// ==================== Core Functions ====================

/**
 * Calculate XP required to reach a specific level
 * Formula: Sum of XP needed for each level (cumulative)
 * Per-level XP = floor(level + 300 * 2^(level / 7)) / 4
 *
 * This produces an exponential curve where:
 * - Level 1: 0 XP (starting point)
 * - Level 2: ~100 XP (fast early progression)
 * - Level 10: ~2000 XP (steady mid-game)
 * - Level 30: ~13000 XP (substantial investment)
 * - Level 50: ~76000 XP (max level achievement)
 */
export function getXpForLevel(level: number): number {
  // Handle edge cases
  if (level <= 1) return 0;

  // Cap at max level
  const cappedLevel = Math.min(level, ADVENTURE_XP_CONFIG.MAX_LEVEL);

  // Calculate cumulative XP using RuneScape-inspired formula
  // Sum of XP needed for each level from 1 to (level - 1)
  let totalXp = 0;
  for (let i = 1; i < cappedLevel; i++) {
    // Per-level XP = floor(i + 300 * 2^(i / 7)) / 4
    // This creates smooth exponential growth
    const xpForThisLevel = Math.floor((i + 300 * Math.pow(2, i / ADVENTURE_XP_CONFIG.CURVE_DIVISOR)) / 4);
    totalXp += xpForThisLevel;
  }

  return Math.floor(totalXp);
}

/**
 * Calculate level from total XP
 * Uses binary search to find the level corresponding to given XP
 */
export function getLevelFromXp(totalXp: number): number {
  // Handle edge cases
  if (totalXp <= 0) return 1;

  // Binary search for the correct level
  let low = 1;
  let high = ADVENTURE_XP_CONFIG.MAX_LEVEL;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const xpForMid = getXpForLevel(mid);

    if (xpForMid <= totalXp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return Math.min(low, ADVENTURE_XP_CONFIG.MAX_LEVEL);
}

/**
 * Get detailed XP progress information for UI display
 */
export function getXpProgress(totalXp: number): AdventureXpProgress {
  const currentLevel = getLevelFromXp(totalXp);
  const isMaxLevel = currentLevel >= ADVENTURE_XP_CONFIG.MAX_LEVEL;

  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = isMaxLevel ? currentLevelXp : getXpForLevel(currentLevel + 1);

  const xpInCurrentLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;

  const progressPercent = isMaxLevel
    ? 100
    : Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    currentLevel,
    progressPercent,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    isMaxLevel,
  };
}

/**
 * Check if a level up occurred
 */
export function checkLevelUp(oldLevel: number, newLevel: number): LevelUpCheck {
  if (newLevel <= oldLevel) {
    return {
      leveledUp: false,
    };
  }

  return {
    leveledUp: true,
    newLevel,
  };
}

/**
 * Calculate XP earned from an adventure game
 *
 * @param difficulty - Game difficulty (easy/medium/hard)
 * @param combo - Combo level (1+)
 * @param bonuses - Additional bonuses (perfect clear, time bonus)
 * @returns Total XP earned
 */
export function calculateAdventureXp(
  difficulty: Difficulty,
  combo: number,
  bonuses: AdventureXpBonuses = {}
): number {
  // Base XP from difficulty
  const baseXp = ADVENTURE_XP_CONFIG.DIFFICULTY_XP[difficulty] || ADVENTURE_XP_CONFIG.DIFFICULTY_XP.medium;

  // Normalize combo to at least 1
  const normalizedCombo = Math.max(1, combo);

  // Calculate combo multiplier (1.0 + 0.1 per combo level above 1)
  const comboMultiplier = 1 + (normalizedCombo - 1) * ADVENTURE_XP_CONFIG.COMBO_MULTIPLIER;

  // Start with base XP * combo
  let totalXp = baseXp * comboMultiplier;

  // Apply perfect clear bonus
  if (bonuses.perfectClear) {
    totalXp *= (1 + ADVENTURE_XP_CONFIG.PERFECT_CLEAR_BONUS);
  }

  // Apply time bonus
  if (bonuses.timeBonus && bonuses.timeBonus > 0) {
    totalXp *= (1 + bonuses.timeBonus);
  }

  // Apply world-based XP scaling: +25% per world above 1
  // W1=1.0x, W5=2.0x, W10=3.25x — makes later worlds worth pursuing
  if (bonuses.worldId && bonuses.worldId > 1) {
    totalXp *= 1 + (bonuses.worldId - 1) * ADVENTURE_XP_CONFIG.WORLD_XP_MULTIPLIER;
  }

  return Math.round(totalXp);
}

// ==================== Exports ====================

// Export config for testing
export { ADVENTURE_XP_CONFIG as AdventureXpConfig };
