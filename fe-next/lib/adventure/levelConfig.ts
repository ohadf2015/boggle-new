/**
 * Adventure Mode Level Configuration — orchestration entry point.
 *
 * Per-level assembly: merges world config, archetype, objectives, special
 * tiles, and hidden-word milestones into a single LevelConfig.
 *
 * Sibling modules carry the details:
 *   - worldConfig.ts    WORLD_CONFIGS + getWorldConfig
 *   - objectives.ts     generateObjectives (boss + archetype-driven)
 *   - specialTiles.ts   generateSpecialTiles + applyGemDetectorBoost
 */

import type { LevelConfig } from '@/types/adventure';
import {
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  getGridSize,
  getTimerDuration,
  getDifficultyForWorld,
} from './constants';
import { getBossConfig } from './bossConfig';
import { getHuntLifePoints } from './huntMode';
import { hasWordPath } from './gridValidator';
import { getArchetypeForLevel, getArchetypeConfig } from './levelArchetypes';
import { getThemeDisplayKey, getThemedWords, getThemeBonusMultiplier } from './themedWords';
import { getWorldConfig } from './worldConfig';
import { generateObjectives } from './objectives';
import { generateSpecialTiles } from './specialTiles';

// Re-export public surface consumed by other modules (lib/adventure barrel, tests).
export {
  WORLD_CONFIGS,
  getWorldConfig,
  getAllWorldConfigs,
  type WorldConfig,
} from './worldConfig';
export { generateObjectives } from './objectives';
export { generateSpecialTiles, applyGemDetectorBoost } from './specialTiles';

/**
 * Hidden words for bonus stars on milestone levels.
 * Level 4 = mid-boss chapter, Level 7 = final boss level.
 */
const HIDDEN_WORDS: Record<string, string> = {
  '1-4': 'MAGIC',
  '1-7': 'ADVENTURE',
  '2-4': 'CRYSTAL',
  '2-7': 'LANGUAGE',
  '3-4': 'ANCIENT',
  '3-7': 'KNOWLEDGE',
  '4-4': 'ISLAND',
  '4-7': 'TREASURE',
  '5-4': 'COMPOUND',
  '5-7': 'BUILDER',
  '6-4': 'PUZZLE',
  '6-7': 'TWISTED',
  '7-4': 'MIRROR',
  '7-7': 'REFLECT',
  '8-4': 'COSMOS',
  '8-7': 'STELLAR',
  '9-4': 'GLOBAL',
  '9-7': 'WISDOM',
  '10-4': 'THRONE',
  '10-7': 'LEXICON',
};

/**
 * Get level configuration for a specific world and level.
 *
 * @param world - World number (1-10), or 0 for endless/weekly mode sentinel
 * @param level - Level within world (1-7), or endless floor (>= 1)
 * @param grid  - Optional letter grid for vowel protection (ice avoids vowels)
 */
export function getLevelConfig(
  world: number,
  level: number,
  grid?: string[][]
): LevelConfig {
  if (world !== 0 && (world < 1 || world > WORLDS_COUNT)) {
    throw new Error(
      `Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`
    );
  }
  if (world !== 0 && (level < 1 || level > LEVELS_PER_WORLD)) {
    throw new Error(
      `Invalid level: ${level}. Must be between 1 and ${LEVELS_PER_WORLD}.`
    );
  }
  if (world === 0 && level < 1) {
    throw new Error('Invalid endless floor: must be >= 1.');
  }
  // For endless mode (world=0), use world 1 config as base
  const effectiveWorld = world === 0 ? 1 : world;

  const worldConfig = getWorldConfig(effectiveWorld);
  const gridSize = getGridSize(effectiveWorld);
  const difficulty = getDifficultyForWorld(effectiveWorld);

  // Endless mode (world=0) cycles archetypes via modular arithmetic
  const archetypeLevel = world === 0 ? ((level - 1) % LEVELS_PER_WORLD) + 1 : level;
  const archetype = getArchetypeForLevel(effectiveWorld, archetypeLevel);
  const archetypeConfig = getArchetypeConfig(archetype);

  // Apply archetype timer multiplier to base world timer.
  // timerMultiplier of 0 signals non-timer mode (blast = move-limited, hunt = life-based)
  // Floor at 80s to prevent unplayable timers on timer-based archetypes.
  const baseTimer = getTimerDuration(effectiveWorld);
  const timerSeconds = archetypeConfig.timerMultiplier === 0
    ? 0
    : Math.max(80, Math.round(baseTimer * archetypeConfig.timerMultiplier));

  // Pass grid for vowel protection on ice tiles
  const objectives = generateObjectives(effectiveWorld, level, grid, archetype);
  const specialTiles = generateSpecialTiles(effectiveWorld, level, gridSize, grid, archetype);

  // Chapter structure (2-2-3 pattern)
  // Chapter 1: levels 1-2, Chapter 2: levels 3-4, Chapter 3 (Boss): levels 5-7
  const chapterNumber: 1 | 2 | 3 = level <= 2 ? 1 : level <= 4 ? 2 : 3;
  const levelInChapter: 1 | 2 | 3 =
    level <= 2
      ? (level as 1 | 2 | 3)
      : level <= 4
        ? ((level - 2) as 1 | 2 | 3)
        : ((level - 4) as 1 | 2 | 3);
  const isBossLevel = level === LEVELS_PER_WORLD;

  // World 1 is tutorial — allow 2-letter words for easier introduction
  const minWordLength: 2 | 3 = effectiveWorld === 1 ? 2 : 3;

  const config: LevelConfig = {
    world,
    level,
    gridSize,
    timerSeconds,
    minWordLength,
    objectives,
    specialTiles,
    difficulty,
    chapterNumber,
    levelInChapter,
    isBossLevel,
    archetype,
  };

  if (worldConfig.mechanic) {
    config.worldMechanic = worldConfig.mechanic;
  }

  // Archetype-specific config fields
  if (archetype === 'blast') {
    // Move-limited: ~60% of total tiles as move budget
    config.movesLimit = Math.round(gridSize * gridSize * 0.6);
  } else if (archetype === 'hunt') {
    config.hasTargetWord = true;
    config.lifePoints = getHuntLifePoints(world);
  } else if (archetype === 'wheel') {
    // Wheel archetype routes to AdventureWheelGame (ring layout, center-letter rule).
    // Boggle-grid config below is unused for wheel levels but kept as a fallback shape.
  } else if (archetype === 'forge') {
    config.hasRunePick = true;
  }

  // Hidden word for milestone levels — only if the word can be formed on the grid
  const hiddenWordKey = `${world}-${level}`;
  const hiddenWord = HIDDEN_WORDS[hiddenWordKey];
  if (hiddenWord) {
    const wordValid = !grid || hasWordPath(grid.flat(), gridSize, hiddenWord);
    if (wordValid) {
      config.hiddenWord = hiddenWord;
    }
  }

  // Theme display information for UI
  config.themeDisplayKey = getThemeDisplayKey(effectiveWorld);
  config.gameModeDisplayKey = archetypeConfig.nameKey;
  config.themedWordCount = getThemedWords(effectiveWorld).length;
  config.themedBonusMultiplier = getThemeBonusMultiplier(effectiveWorld);

  // Boss twist mechanic for boss levels
  if (isBossLevel) {
    config.showBossIntro = true;
    const bossConfig = getBossConfig(world);
    if (bossConfig) {
      config.bossTwist = bossConfig.twistMechanic.type;
    }
  }

  return config;
}

/**
 * Get all level configs for a specific world (7 levels).
 */
export function getWorldLevels(world: number): LevelConfig[] {
  return Array.from({ length: LEVELS_PER_WORLD }, (_, i) =>
    getLevelConfig(world, i + 1)
  );
}

/**
 * Get all level configs for all worlds (70 levels, ordered by world then level).
 */
export function getAllLevelConfigs(): LevelConfig[] {
  const configs: LevelConfig[] = [];
  for (let world = 1; world <= WORLDS_COUNT; world++) {
    for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
      configs.push(getLevelConfig(world, level));
    }
  }
  return configs;
}

// ==============================================
// VALIDATION
// ==============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a level configuration — returns collected errors, not throws.
 */
export function validateLevelConfig(config: LevelConfig): ValidationResult {
  const errors: string[] = [];

  if (config.world !== 0 && (config.world < 1 || config.world > WORLDS_COUNT)) {
    errors.push('Invalid world: must be 1-10');
  }

  // world=0 is endless mode — unbounded floors
  if (config.world !== 0 && (config.level < 1 || config.level > LEVELS_PER_WORLD)) {
    errors.push('Invalid level: must be 1-7');
  } else if (config.world === 0 && config.level < 1) {
    errors.push('Invalid endless floor: must be >= 1');
  }

  if (![4, 5, 6, 7].includes(config.gridSize)) {
    errors.push('Invalid grid size: must be 4, 5, 6, or 7');
  }

  // 0 is allowed for non-timer archetypes (blast = move-limited, hunt = life-based)
  if (config.timerSeconds < 0) {
    errors.push('Invalid timer: must be >= 0');
  }

  if (config.objectives.length === 0) {
    errors.push('At least one objective required');
  }

  const hasPrimary = config.objectives.some((o) => o.isPrimary);
  if (!hasPrimary && config.objectives.length > 0) {
    errors.push('At least one primary objective required');
  }

  for (const tile of config.specialTiles) {
    if (tile.row < 0 || tile.row >= config.gridSize) {
      errors.push(`Special tile at row ${tile.row} is outside grid bounds`);
    }
    if (tile.col < 0 || tile.col >= config.gridSize) {
      errors.push(`Special tile at col ${tile.col} is outside grid bounds`);
    }
  }

  if (!['EASY', 'MEDIUM', 'HARD'].includes(config.difficulty)) {
    errors.push('Invalid difficulty: must be EASY, MEDIUM, or HARD');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
