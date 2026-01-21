/**
 * Adventure Mode Level Configuration
 *
 * World definitions, level configurations, and objective/tile generators
 * for the Adventure Mode progression system.
 */

import type {
  LevelConfig,
  LevelObjective,
  SpecialTile,
  ObjectiveType,
  TileType,
} from '@/types/adventure';
import {
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  OBJECTIVE_TYPES,
  TILE_TYPES,
  getGridSize,
  getTimerDuration,
  getDifficultyForWorld,
} from './constants';

// ==============================================
// WORLD CONFIGURATION
// ==============================================

/**
 * Configuration for a themed world
 */
export interface WorldConfig {
  /** World number (1-10) */
  id: number;
  /** Translation key for world name */
  name: string;
  /** Visual theme identifier */
  theme: string;
  /** Special mechanic for this world (null for tutorial) */
  mechanic: string | null;
  /** Translation key for boss name */
  bossName: string;
  /** Primary Tailwind color class */
  colorPrimary: string;
  /** Secondary Tailwind color class */
  colorSecondary: string;
  /** World description key */
  description: string;
}

/**
 * All world configurations
 */
export const WORLD_CONFIGS: WorldConfig[] = [
  {
    id: 1,
    name: 'alphabetMeadows',
    theme: 'sunny-pastoral',
    mechanic: null, // Tutorial - no special mechanic
    bossName: 'msGrammar',
    colorPrimary: 'neo-lime',
    colorSecondary: 'neo-lime-light',
    description: 'worldDescAlphabetMeadows',
  },
  {
    id: 2,
    name: 'synonymSprings',
    theme: 'waterfalls',
    mechanic: 'synonymPairs', // +25% for synonym pairs
    bossName: 'spellingBee',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-cyan-light',
    description: 'worldDescSynonymSprings',
  },
  {
    id: 3,
    name: 'rootCaverns',
    theme: 'crystal-caves',
    mechanic: 'etymologyRoots', // Bonus for Latin/Greek roots
    bossName: 'professorThesaurus',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-purple-light',
    description: 'worldDescRootCaverns',
  },
  {
    id: 4,
    name: 'idiomArchipelago',
    theme: 'tropical-islands',
    mechanic: 'idioms', // Hidden idiom challenges
    bossName: 'captainMetaphor',
    colorPrimary: 'neo-orange',
    colorSecondary: 'neo-yellow',
    description: 'worldDescIdiomArchipelago',
  },
  {
    id: 5,
    name: 'compoundCanyon',
    theme: 'desert-cliffs',
    mechanic: 'compounds', // +30% for compound words
    bossName: 'baronBuildaword',
    colorPrimary: 'neo-red',
    colorSecondary: 'neo-orange',
    description: 'worldDescCompoundCanyon',
  },
  {
    id: 6,
    name: 'anagramLabyrinth',
    theme: 'escher-maze',
    mechanic: 'anagrams', // Solve anagrams for bonuses
    bossName: 'puzzleMaster',
    colorPrimary: 'neo-pink',
    colorSecondary: 'neo-pink-light',
    description: 'worldDescAnagramLabyrinth',
  },
  {
    id: 7,
    name: 'mirrorPalace',
    theme: 'reflective-glass',
    mechanic: 'palindromes', // +50% for palindromes
    bossName: 'reflectionKing',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-white',
    description: 'worldDescMirrorPalace',
  },
  {
    id: 8,
    name: 'neologismNebula',
    theme: 'space-stars',
    mechanic: 'rareWords', // +40% for rare/new words
    bossName: 'cosmicWordsmith',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-pink',
    description: 'worldDescNeologismNebula',
  },
  {
    id: 9,
    name: 'polyglotPeaks',
    theme: 'mountain-aurora',
    mechanic: 'multilingual', // Multi-language word bonuses
    bossName: 'linguistSage',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-lime',
    description: 'worldDescPolyglotPeaks',
  },
  {
    id: 10,
    name: 'lexiconThrone',
    theme: 'golden-library',
    mechanic: 'allMechanics', // All mechanics combined
    bossName: 'lexiconDragon',
    colorPrimary: 'neo-yellow',
    colorSecondary: 'neo-orange',
    description: 'worldDescLexiconThrone',
  },
];

/**
 * Get configuration for a specific world
 *
 * @param world - World number (1-10)
 * @returns World configuration
 * @throws Error if world number is invalid
 */
export function getWorldConfig(world: number): WorldConfig {
  if (world < 1 || world > WORLDS_COUNT) {
    throw new Error(
      `Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`
    );
  }
  return WORLD_CONFIGS[world - 1];
}

/**
 * Get all world configurations
 *
 * @returns Array of all world configurations
 */
export function getAllWorldConfigs(): WorldConfig[] {
  return [...WORLD_CONFIGS];
}

// ==============================================
// LEVEL CONFIGURATION
// ==============================================

/**
 * Hidden words for bonus stars on milestone levels
 */
const HIDDEN_WORDS: Record<string, string> = {
  '1-5': 'MAGIC',
  '1-10': 'ADVENTURE',
  '2-5': 'CRYSTAL',
  '2-10': 'LANGUAGE',
  '3-5': 'ANCIENT',
  '3-10': 'KNOWLEDGE',
  '4-5': 'ISLAND',
  '4-10': 'TREASURE',
  '5-5': 'COMPOUND',
  '5-10': 'BUILDER',
  '6-5': 'PUZZLE',
  '6-10': 'TWISTED',
  '7-5': 'MIRROR',
  '7-10': 'REFLECT',
  '8-5': 'COSMOS',
  '8-10': 'STELLAR',
  '9-5': 'GLOBAL',
  '9-10': 'WISDOM',
  '10-5': 'THRONE',
  '10-10': 'LEXICON',
};

/**
 * Get level configuration for a specific world and level
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-10)
 * @returns Complete level configuration
 * @throws Error if world or level is invalid
 */
export function getLevelConfig(world: number, level: number): LevelConfig {
  // Validate inputs
  if (world < 1 || world > WORLDS_COUNT) {
    throw new Error(
      `Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`
    );
  }
  if (level < 1 || level > LEVELS_PER_WORLD) {
    throw new Error(
      `Invalid level: ${level}. Must be between 1 and ${LEVELS_PER_WORLD}.`
    );
  }

  const worldConfig = getWorldConfig(world);
  const gridSize = getGridSize(world);
  const timerSeconds = getTimerDuration(world);
  const difficulty = getDifficultyForWorld(world);

  // Generate level-specific content
  const objectives = generateObjectives(world, level);
  const specialTiles = generateSpecialTiles(world, level, gridSize);

  // Build config
  const config: LevelConfig = {
    world,
    level,
    gridSize,
    timerSeconds,
    objectives,
    specialTiles,
    difficulty,
  };

  // Add world mechanic for non-tutorial worlds
  if (worldConfig.mechanic) {
    config.worldMechanic = worldConfig.mechanic;
  }

  // Add hidden word for milestone levels (5 and 10)
  const hiddenWordKey = `${world}-${level}`;
  if (HIDDEN_WORDS[hiddenWordKey]) {
    config.hiddenWord = HIDDEN_WORDS[hiddenWordKey];
  }

  return config;
}

/**
 * Get all level configs for a specific world
 *
 * @param world - World number (1-10)
 * @returns Array of 10 level configurations
 */
export function getWorldLevels(world: number): LevelConfig[] {
  return Array.from({ length: LEVELS_PER_WORLD }, (_, i) =>
    getLevelConfig(world, i + 1)
  );
}

/**
 * Get all level configs for all worlds
 *
 * @returns Array of 100 level configurations (ordered by world, then level)
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
// OBJECTIVE GENERATION
// ==============================================

/**
 * Generate objectives for a level
 *
 * @param world - World number
 * @param level - Level within world
 * @returns Array of level objectives
 */
export function generateObjectives(
  world: number,
  level: number
): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  const globalLevel = (world - 1) * LEVELS_PER_WORLD + level;

  // Primary objective: Alternate between wordCount and scoreTarget
  if (level % 2 === 1) {
    // Odd levels: word count
    // Base: 8 words, +2 every 5 global levels, max 25
    const target = Math.min(8 + Math.floor(globalLevel / 5) * 2, 25);
    objectives.push({
      type: OBJECTIVE_TYPES.WORD_COUNT as ObjectiveType,
      target,
      isPrimary: true,
    });
  } else {
    // Even levels: score target
    // Base: 200, +30 per global level, max 1000
    const target = Math.min(200 + globalLevel * 30, 1000);
    objectives.push({
      type: OBJECTIVE_TYPES.SCORE_TARGET as ObjectiveType,
      target,
      isPrimary: true,
    });
  }

  // Secondary objectives based on level progression

  // Long words objective (level 3+)
  if (level >= 3) {
    // 1 long word at level 3, +1 every 3 levels, max 5
    const target = Math.min(1 + Math.floor((level - 3) / 3), 5);
    objectives.push({
      type: OBJECTIVE_TYPES.LONG_WORDS as ObjectiveType,
      target,
      isPrimary: false,
    });
  }

  // Clear ice objective (world 2+, level 5+)
  if (world >= 2 && level >= 5) {
    // 2 ice tiles + 1 per 2 levels, max 10
    const target = Math.min(2 + Math.floor((level - 5) / 2), 10);
    objectives.push({
      type: OBJECTIVE_TYPES.CLEAR_ICE as ObjectiveType,
      target,
      isPrimary: false,
    });
  }

  // Time bonus objective (level 7+, worlds 3+)
  if (world >= 3 && level >= 7) {
    // Complete with 30+ seconds remaining
    const target = Math.max(30 - (world - 3) * 5, 10);
    objectives.push({
      type: OBJECTIVE_TYPES.TIME_BONUS as ObjectiveType,
      target,
      isPrimary: false,
    });
  }

  return objectives;
}

// ==============================================
// SPECIAL TILE GENERATION
// ==============================================

/**
 * Generate special tiles for a level
 *
 * @param world - World number
 * @param level - Level within world
 * @param gridSize - Size of the grid (4-7)
 * @returns Array of special tile positions
 */
export function generateSpecialTiles(
  world: number,
  level: number,
  gridSize: number
): SpecialTile[] {
  const tiles: SpecialTile[] = [];
  const usedPositions = new Set<string>();

  /**
   * Add a tile at a random unique position
   */
  const addTile = (type: TileType): void => {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      const posKey = `${row},${col}`;

      if (!usedPositions.has(posKey)) {
        usedPositions.add(posKey);
        tiles.push({ row, col, type });
        return;
      }
      attempts++;
    }
  };

  // World 1: No special tiles for levels 1-7 (tutorial)
  if (world === 1 && level < 8) {
    return tiles;
  }

  // Gold tiles: World 1 level 8+, increasing count
  if ((world >= 1 && level >= 8) || world >= 2) {
    const goldCount = Math.min(
      1 + Math.floor((world - 1) / 2) + Math.floor(level / 5),
      4
    );
    for (let i = 0; i < goldCount; i++) {
      addTile(TILE_TYPES.GOLD as TileType);
    }
  }

  // Ice tiles: World 2+
  if (world >= 2) {
    // Base: 2 ice tiles, +1 per 3 levels, +1 per world, max 8
    const iceCount = Math.min(2 + Math.floor(level / 3) + (world - 2), 8);
    for (let i = 0; i < iceCount; i++) {
      addTile(TILE_TYPES.ICE as TileType);
    }
  }

  // Bomb tiles: World 3+, level 3+
  if (world >= 3 && level >= 3) {
    // 1 bomb tile, +1 for level 7+
    const bombCount = level >= 7 ? 2 : 1;
    for (let i = 0; i < bombCount; i++) {
      addTile(TILE_TYPES.BOMB as TileType);
    }
  }

  // Rainbow tiles: World 5+, level 5+
  if (world >= 5 && level >= 5) {
    // 1 rainbow tile, rare
    addTile(TILE_TYPES.RAINBOW as TileType);
  }

  return tiles;
}

// ==============================================
// VALIDATION
// ==============================================

/**
 * Validation result for level config
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a level configuration
 *
 * @param config - Level configuration to validate
 * @returns Validation result with errors
 */
export function validateLevelConfig(config: LevelConfig): ValidationResult {
  const errors: string[] = [];

  // Validate world
  if (config.world < 1 || config.world > WORLDS_COUNT) {
    errors.push('Invalid world: must be 1-10');
  }

  // Validate level
  if (config.level < 1 || config.level > LEVELS_PER_WORLD) {
    errors.push('Invalid level: must be 1-10');
  }

  // Validate grid size
  if (![4, 5, 6, 7].includes(config.gridSize)) {
    errors.push('Invalid grid size: must be 4, 5, 6, or 7');
  }

  // Validate timer
  if (config.timerSeconds <= 0) {
    errors.push('Invalid timer: must be positive');
  }

  // Validate objectives
  if (config.objectives.length === 0) {
    errors.push('At least one objective required');
  }

  const hasPrimary = config.objectives.some((o) => o.isPrimary);
  if (!hasPrimary && config.objectives.length > 0) {
    errors.push('At least one primary objective required');
  }

  // Validate special tiles
  for (const tile of config.specialTiles) {
    if (tile.row < 0 || tile.row >= config.gridSize) {
      errors.push(`Special tile at row ${tile.row} is outside grid bounds`);
    }
    if (tile.col < 0 || tile.col >= config.gridSize) {
      errors.push(`Special tile at col ${tile.col} is outside grid bounds`);
    }
  }

  // Validate difficulty
  if (!['EASY', 'MEDIUM', 'HARD'].includes(config.difficulty)) {
    errors.push('Invalid difficulty: must be EASY, MEDIUM, or HARD');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
