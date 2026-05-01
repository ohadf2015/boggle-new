/**
 * Adventure Mode Constants
 *
 * Core game constants and utility functions for Adventure Mode progression system.
 * These values are aligned with database functions in 049_adventure_mode.sql.
 */

// ==============================================
// CORE GAME CONSTANTS
// ==============================================

/**
 * Total number of worlds in Adventure Mode
 */
export const WORLDS_COUNT = 10;

/**
 * Number of levels per world (7 levels in 2-2-3 chapter structure)
 */
export const LEVELS_PER_WORLD = 7;

/**
 * Total number of levels (WORLDS_COUNT * LEVELS_PER_WORLD)
 */
export const TOTAL_LEVELS = WORLDS_COUNT * LEVELS_PER_WORLD;

// ==============================================
// CHAPTER STRUCTURE CONSTANTS
// ==============================================

/**
 * Number of chapters per world (Zone 1, Zone 2, Boss Zone)
 */
export const CHAPTERS_PER_WORLD = 3;

/**
 * Chapter structure: levels per chapter
 * Chapter 1: 2 levels, Chapter 2: 2 levels, Chapter 3: 3 levels (boss)
 */
export const CHAPTER_STRUCTURE: [number, number, number] = [2, 2, 3];

/**
 * Maximum player level achievable
 */
export const MAX_PLAYER_LEVEL = 50;

// ==============================================
// XP PROGRESSION CONSTANTS
// ==============================================

/**
 * Base XP awarded for completing a level (first time)
 */
export const BASE_COMPLETION_XP = 50;

/**
 * XP awarded per star earned (only for new stars)
 */
export const XP_PER_STAR = 25;

/**
 * Maximum XP for any single level completion
 * (BASE_COMPLETION_XP + 3 stars * XP_PER_STAR = 125)
 */
export const MAX_LEVEL_XP = BASE_COMPLETION_XP + 3 * XP_PER_STAR;

// ==============================================
// STAR & UNLOCK PROGRESSION
// ==============================================

/**
 * Minimum stars needed to unlock next level (must earn at least 1 star)
 */
export const STARS_TO_UNLOCK_NEXT_LEVEL = 1;

/**
 * Stars needed from previous world to unlock next world
 * (11 stars = ~52% of world's 21 possible stars)
 */
export const STARS_TO_UNLOCK_NEXT_WORLD = 11;

/**
 * Legacy constant — World 10 uses the standard formula (11 * 9 = 99 stars).
 */
export const TOTAL_STARS_FOR_FINAL_WORLD = 99;

/**
 * Maximum stars per level
 */
export const MAX_STARS_PER_LEVEL = 3;

/**
 * Maximum stars per world (LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL)
 */
export const MAX_STARS_PER_WORLD = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;

// ==============================================
// TILE TYPE CONSTANTS
// ==============================================

/**
 * All special tile types available in Adventure Mode
 */
export const TILE_TYPES = {
  /** Normal letter tile */
  STANDARD: 'standard',
  /** 3x score multiplier */
  GOLD: 'gold',
  /** Obstacle - must be cleared by using adjacent tiles */
  ICE: 'ice',
  /** Score Bomb — doubles the word's score when included */
  BOMB: 'bomb',
  /** Adds bonus time when used in a word */
  TIME: 'time',
} as const;

// ==============================================
// OBJECTIVE TYPE CONSTANTS
// ==============================================

/**
 * All objective types available in Adventure Mode
 */
export const OBJECTIVE_TYPES = {
  // Regular level objectives
  /** Find N words */
  WORD_COUNT: 'wordCount',
  /** Achieve N points */
  SCORE_TARGET: 'scoreTarget',
  /** Clear N ice tiles */
  CLEAR_ICE: 'clearIce',
  /** Find N words with 5+ letters */
  LONG_WORDS: 'longWords',
  /** Complete with N seconds remaining */
  TIME_BONUS: 'timeBonus',
  /** Collect N special gems */
  COLLECT_GEMS: 'collectGems',

  // Boss level objectives (level 7 of each world)
  /** Primary: Reduce boss HP to 0 */
  DEFEAT_BOSS: 'defeatBoss',
  /** Secondary: Finish with X% player health remaining */
  SURVIVE_BATTLE: 'surviveBattle',
  /** Secondary: Trigger boss twist mechanic N times */
  MECHANIC_TRIGGER: 'mechanicTrigger',
  /** Bonus: Complete without taking any damage */
  NO_DAMAGE: 'noDamage',
} as const;

// ==============================================
// OBJECTIVE TRANSLATION KEYS
// ==============================================

/**
 * Maps ObjectiveType to translation keys for UI display.
 * Shared across components that render objective labels.
 */
export const OBJECTIVE_TRANSLATION_KEYS: Record<string, string> = {
  // Regular level objectives
  wordCount: 'adventure.objectives.wordCount',
  scoreTarget: 'adventure.objectives.scoreTarget',
  longWords: 'adventure.objectives.longWords',
  clearIce: 'adventure.objectives.clearIce',
  timeBonus: 'adventure.objectives.timeBonus',
  collectGems: 'adventure.objectives.collectGems',
  // Boss level objectives
  defeatBoss: 'adventure.objectives.defeatBoss',
  surviveBattle: 'adventure.objectives.surviveBattle',
  mechanicTrigger: 'adventure.objectives.mechanicTrigger',
  noDamage: 'adventure.objectives.noDamage',
};

// ==============================================
// GRID SIZE CONFIGURATION
// ==============================================

/**
 * Grid sizes per world (4x4 to 7x7)
 * Progressively larger grids for higher worlds
 */
export const GRID_SIZES: Record<number, 4 | 5 | 6 | 7> = {
  1: 4, // Tutorial - smallest grid
  2: 4, // Tutorial - smallest grid
  3: 5, // Standard difficulty begins
  4: 5,
  5: 5,
  6: 6, // Challenging difficulty
  7: 6,
  8: 6,
  9: 7, // Expert difficulty
  10: 7, // Final world - largest grid
};

/**
 * Get grid size for a world (with fallback)
 */
export function getGridSize(world: number): 4 | 5 | 6 | 7 {
  if (world < 1) return GRID_SIZES[1];
  if (world > 10) return GRID_SIZES[10];
  return GRID_SIZES[world];
}

// ==============================================
// TIMER CONFIGURATION
// ==============================================

/**
 * Timer durations per world (in seconds)
 *
 * Calibrated to maintain consistent per-tile search time across grid sizes.
 * Target: ~4-5 seconds per tile on average, decreasing gently with world.
 *
 * Formula rationale:
 *   World 1-2 (4x4=16 tiles): ~7.5s/tile → generous for tutorial
 *   World 3-5 (5x5=25 tiles): ~5s/tile → fair challenge
 *   World 6-8 (6x6=36 tiles): ~4s/tile → tight but doable with upgrades
 *   World 9-10 (7x7=49 tiles): ~3.5s/tile → expert, requires Fuel Tank upgrade
 *
 * Previous flat -5s/world curve caused per-tile time to drop from 7.5s→1.6s.
 * New curve accounts for grid area growth at Worlds 3, 6, and 9.
 */
export const TIMER_DURATIONS: Record<number, number> = {
  1: 150, // 4x4 (16 tiles) — 9.4s/tile — tutorial generosity (F3 audit 2026-05-01)
  2: 110, // 4x4 (16 tiles) — 6.9s/tile — slight pressure increase
  3: 140, // 5x5 (25 tiles) — 5.6s/tile — grid grows, timer bumps to compensate
  4: 135, // 5x5 (25 tiles) — 5.4s/tile
  5: 125, // 5x5 (25 tiles) — 5.0s/tile
  6: 150, // 6x6 (36 tiles) — 4.2s/tile — grid grows again, timer bumps
  7: 140, // 6x6 (36 tiles) — 3.9s/tile
  8: 135, // 6x6 (36 tiles) — 3.8s/tile
  9: 170, // 7x7 (49 tiles) — 3.5s/tile — grid grows, timer bumps
  10: 160, // 7x7 (49 tiles) — 3.3s/tile — final world, still challenging
};

/**
 * Get timer duration for a world (with fallback)
 */
export function getTimerDuration(world: number): number {
  if (world < 1) return TIMER_DURATIONS[1];
  if (world > 10) return TIMER_DURATIONS[10];
  return TIMER_DURATIONS[world];
}

// ==============================================
// WORLD UNLOCK FUNCTIONS
// ==============================================

/**
 * Get stars required to unlock a specific world
 *
 * @param world - World number (1-10)
 * @returns Stars required to unlock
 */
export function getWorldUnlockRequirement(world: number): number {
  if (world <= 1) return 0; // World 1 always unlocked
  if (world === 2) return 7; // Lowered: 1-star avg player can unlock W2

  // Consistent 11-star gap from W2 onward: W3=18, W4=29, ... W10=95
  // Anchored to W2's lowered requirement (7) so there's no sudden jump
  const clamped = Math.min(world, WORLDS_COUNT);
  return 7 + STARS_TO_UNLOCK_NEXT_WORLD * (clamped - 2);
}

/**
 * Check if a world is unlocked based on total stars
 *
 * @param world - World number (1-10)
 * @param totalStars - Player's total stars
 * @returns true if world is unlocked
 */
export function isWorldUnlocked(world: number, totalStars: number): boolean {
  return totalStars >= getWorldUnlockRequirement(world);
}

/**
 * Check if a level is unlocked within a world
 *
 * @param world - World number (1-10)
 * @param level - Level number within world (1-10)
 * @param completions - Array of completed levels with stars
 * @returns true if level is unlocked
 */
export function isLevelUnlocked(
  world: number,
  level: number,
  completions: Array<{ world: number; level: number; stars: number }>
): boolean {
  // Level 1 of any world is always available (if world is unlocked)
  if (level <= 1) return true;

  // Need at least 1 star on previous level in same world
  const previousCompletion = completions.find(
    (c) => c.world === world && c.level === level - 1
  );

  return (
    previousCompletion !== undefined &&
    previousCompletion.stars >= STARS_TO_UNLOCK_NEXT_LEVEL
  );
}

/**
 * Get the next locked level for a player
 *
 * @param currentWorld - Current world
 * @param completions - Array of completed levels
 * @returns { world, level } of next locked level, or null if all complete
 */
export function getNextUnlockedLevel(
  currentWorld: number,
  completions: Array<{ world: number; level: number; stars: number }>
): { world: number; level: number } | null {
  // Find highest completed level in current world
  const worldCompletions = completions.filter((c) => c.world === currentWorld);
  const maxLevel = worldCompletions.reduce(
    (max, c) => Math.max(max, c.level),
    0
  );

  // If not all levels complete in current world
  if (maxLevel < LEVELS_PER_WORLD) {
    return { world: currentWorld, level: maxLevel + 1 };
  }

  // Move to next world
  if (currentWorld < WORLDS_COUNT) {
    return { world: currentWorld + 1, level: 1 };
  }

  // All complete
  return null;
}

// ==============================================
// DIFFICULTY HELPERS
// ==============================================

/**
 * Get difficulty level for a world
 *
 * @param world - World number (1-10)
 * @returns Difficulty string
 */
export function getDifficultyForWorld(world: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (world <= 3) return 'EASY';
  if (world <= 6) return 'MEDIUM';
  return 'HARD';
}

/**
 * Get the global level number (1-100) from world and level
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-10)
 * @returns Global level number (1-100)
 */
export function getGlobalLevel(world: number, level: number): number {
  return (world - 1) * LEVELS_PER_WORLD + level;
}

/**
 * Get world and level from global level number
 *
 * @param globalLevel - Global level number (1-100)
 * @returns { world, level }
 */
export function getWorldAndLevel(globalLevel: number): {
  world: number;
  level: number;
} {
  const world = Math.ceil(globalLevel / LEVELS_PER_WORLD);
  const level = ((globalLevel - 1) % LEVELS_PER_WORLD) + 1;
  return { world: Math.min(world, WORLDS_COUNT), level };
}
