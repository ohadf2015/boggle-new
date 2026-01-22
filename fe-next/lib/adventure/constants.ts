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
 * Total stars required to unlock the final world (World 10)
 * Special requirement: needs 60 total stars regardless of distribution
 * (60 = ~32% of total 189 possible stars, encourages replaying)
 */
export const TOTAL_STARS_FOR_FINAL_WORLD = 60;

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
  /** Clears entire row when used in a word */
  BOMB: 'bomb',
  /** Wildcard - matches any letter */
  RAINBOW: 'rainbow',
  /** Links adjacent tiles for combo bonuses */
  CHAIN: 'chain',
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
} as const;

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
 * Shorter timers for higher worlds
 */
export const TIMER_DURATIONS: Record<number, number> = {
  1: 120, // 2 minutes - generous for tutorial
  2: 110,
  3: 100,
  4: 90,
  5: 80,
  6: 70,
  7: 60,
  8: 55,
  9: 50,
  10: 45, // 45 seconds - challenging finale
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
// XP CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate XP required to reach a specific level
 * Uses curved progression: Level N requires N^1.5 * 100 XP
 *
 * Must match database function `xp_for_level()` in 049_adventure_mode.sql
 *
 * @param level - Target level (1-50)
 * @returns XP required to reach that level
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  const cappedLevel = Math.min(level, MAX_PLAYER_LEVEL);
  return Math.floor(Math.pow(cappedLevel, 1.5) * 100);
}

/**
 * Calculate player level from total XP
 * Uses curved progression: Level N requires N^1.5 * 100 XP
 *
 * Must match database function `calculate_player_level()` in 049_adventure_mode.sql
 *
 * @param totalXp - Total XP accumulated
 * @returns Current player level (1-50)
 */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  while (level < MAX_PLAYER_LEVEL) {
    const xpRequired = getXpForLevel(level + 1);
    if (totalXp < xpRequired) {
      return level;
    }
    level++;
  }
  return MAX_PLAYER_LEVEL;
}

/**
 * Calculate progress percentage within current level
 *
 * @param totalXp - Total XP accumulated
 * @returns Progress (0.0 to 1.0) toward next level
 */
export function getXpProgressInLevel(totalXp: number): number {
  if (totalXp <= 0) return 0;

  const currentLevel = getLevelFromXp(totalXp);
  if (currentLevel >= MAX_PLAYER_LEVEL) return 1;

  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;

  return xpNeededForNext > 0 ? xpIntoLevel / xpNeededForNext : 0;
}

/**
 * Calculate XP needed to reach next level
 *
 * @param totalXp - Total XP accumulated
 * @returns XP remaining to level up (0 if at max level)
 */
export function getXpToNextLevel(totalXp: number): number {
  const currentLevel = getLevelFromXp(totalXp);
  if (currentLevel >= MAX_PLAYER_LEVEL) return 0;

  const nextLevelXp = getXpForLevel(currentLevel + 1);
  return nextLevelXp - totalXp;
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
  if (world >= 10) return TOTAL_STARS_FOR_FINAL_WORLD; // World 10 needs 80 total stars

  // Worlds 2-9: Need 15 stars per previous world
  return STARS_TO_UNLOCK_NEXT_WORLD * (world - 1);
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
