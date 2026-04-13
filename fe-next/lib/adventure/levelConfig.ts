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
  LevelArchetype,
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
import { VOWELS } from './gridGenerator';
import { getBossConfig } from './bossConfig';
import { hasPathOfLength, hasWordPath } from './gridValidator';
import { getArchetypeForLevel, getArchetypeConfig } from './levelArchetypes';
import { getThemeDisplayKey, getThemedWords, getThemeBonusMultiplier } from './themedWords';

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
  // world=0 is a sentinel for endless/weekly modes — return a default config
  if (world === 0) {
    return WORLD_CONFIGS[0];
  }
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
 * Level 4 = mid-boss chapter, Level 7 = final boss level
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
 * Get level configuration for a specific world and level
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-7)
 * @param grid - Optional letter grid for vowel protection (prevents ice on vowels)
 * @returns Complete level configuration
 * @throws Error if world or level is invalid
 */
export function getLevelConfig(
  world: number,
  level: number,
  grid?: string[][]
): LevelConfig {
  // Validate inputs — world=0 is a sentinel for endless/weekly modes
  if (world !== 0 && (world < 1 || world > WORLDS_COUNT)) {
    throw new Error(
      `Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`
    );
  }
  // Endless mode (world=0) allows unbounded floor numbers
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

  // Determine level archetype for gameplay flavor
  // Endless mode (world=0) cycles through archetypes using modular arithmetic
  const archetypeLevel = world === 0 ? ((level - 1) % LEVELS_PER_WORLD) + 1 : level;
  const archetype = getArchetypeForLevel(effectiveWorld, archetypeLevel);
  const archetypeConfig = getArchetypeConfig(archetype);

  // Apply archetype timer multiplier to base world timer
  // timerMultiplier of 0 signals non-timer mode (blast = move-limited, hunt = life-based)
  // Floor at 80s to prevent unplayable timers on timer-based archetypes
  const baseTimer = getTimerDuration(effectiveWorld);
  const timerSeconds = archetypeConfig.timerMultiplier === 0
    ? 0
    : Math.max(80, Math.round(baseTimer * archetypeConfig.timerMultiplier));

  // Generate level-specific content driven by archetype
  // Pass grid for vowel protection on ice tiles (prevents unfair levels)
  const objectives = generateObjectives(effectiveWorld, level, grid, archetype);
  const specialTiles = generateSpecialTiles(effectiveWorld, level, gridSize, grid, archetype);

  // Calculate chapter structure (2-2-3 pattern)
  // Chapter 1: levels 1-2, Chapter 2: levels 3-4, Chapter 3 (Boss): levels 5-7
  const chapterNumber: 1 | 2 | 3 = level <= 2 ? 1 : level <= 4 ? 2 : 3;
  const levelInChapter: 1 | 2 | 3 =
    level <= 2
      ? (level as 1 | 2 | 3)
      : level <= 4
        ? ((level - 2) as 1 | 2 | 3)
        : ((level - 4) as 1 | 2 | 3);
  const isBossLevel = level === LEVELS_PER_WORLD; // Level 7

  // World 1 is tutorial - allow 2-letter words for easier introduction
  // All other worlds require standard 3-letter minimum
  const minWordLength: 2 | 3 = effectiveWorld === 1 ? 2 : 3;

  // Build config
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

  // Add world mechanic for non-tutorial worlds
  if (worldConfig.mechanic) {
    config.worldMechanic = worldConfig.mechanic;
  }

  // Archetype-specific config fields
  if (archetype === 'blast') {
    // Move-limited: ~60% of total tiles as move budget
    config.movesLimit = Math.round(gridSize * gridSize * 0.6);
  } else if (archetype === 'hunt') {
    config.hasTargetWord = true;
    config.lifePoints = 100;
  } else if (archetype === 'wheel') {
    // Wheel archetype plays as classic on the adventure grid — its secondary
    // "longWords" objective (assigned in generateObjectives) is what differentiates it.
    // The "must include center letter" rule was removed because it created a mismatch
    // with the boggle board (daily Word Wheel uses a ring layout instead).
  } else if (archetype === 'forge') {
    config.hasRunePick = true;
  }

  // Add hidden word for milestone levels (5 and 10)
  // Only include if the word can actually be formed on the grid
  const hiddenWordKey = `${world}-${level}`;
  const hiddenWord = HIDDEN_WORDS[hiddenWordKey];
  if (hiddenWord) {
    const wordValid = !grid || hasWordPath(grid.flat(), gridSize, hiddenWord);
    if (wordValid) {
      config.hiddenWord = hiddenWord;
    }
  }

  // Add theme display information for UI
  config.themeDisplayKey = getThemeDisplayKey(effectiveWorld);
  config.gameModeDisplayKey = archetypeConfig.nameKey;
  config.themedWordCount = getThemedWords(effectiveWorld).length;
  config.themedBonusMultiplier = getThemeBonusMultiplier(effectiveWorld);

  // Add boss twist mechanic for boss levels
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
 * Get all level configs for a specific world
 *
 * @param world - World number (1-10)
 * @returns Array of 7 level configurations
 */
export function getWorldLevels(world: number): LevelConfig[] {
  return Array.from({ length: LEVELS_PER_WORLD }, (_, i) =>
    getLevelConfig(world, i + 1)
  );
}

/**
 * Get all level configs for all worlds
 *
 * @returns Array of 70 level configurations (ordered by world, then level)
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
 * Boss levels (level 7) have battle-focused objectives:
 * - defeatBoss (primary): Reduce boss HP to 0
 * - mechanicTrigger (secondary): Trigger boss twist mechanic N times
 * - surviveBattle (secondary): Finish with X% health remaining
 *
 * Regular levels have standard objectives (wordCount, scoreTarget, etc.)
 *
 * @param world - World number
 * @param level - Level within world
 * @returns Array of level objectives
 */
export function generateObjectives(
  world: number,
  level: number,
  grid?: string[][],
  archetype?: LevelArchetype
): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  const isBossLevel = level === LEVELS_PER_WORLD; // Level 7 is boss
  const effectiveArchetype = archetype ?? getArchetypeForLevel(world, level);
  const archetypeConfig = getArchetypeConfig(effectiveArchetype);

  // =============================================
  // BOSS LEVELS: Battle-focused objectives
  // =============================================
  if (isBossLevel) {
    objectives.push({
      type: OBJECTIVE_TYPES.DEFEAT_BOSS as ObjectiveType,
      target: 100,
      isPrimary: true,
    });

    const mechanicTarget = Math.min(3 + Math.floor(world / 3), 8);
    objectives.push({
      type: OBJECTIVE_TYPES.MECHANIC_TRIGGER as ObjectiveType,
      target: mechanicTarget,
      isPrimary: false,
    });

    objectives.push({
      type: OBJECTIVE_TYPES.SURVIVE_BATTLE as ObjectiveType,
      target: 50,
      isPrimary: false,
    });

    return objectives;
  }

  // =============================================
  // ARCHETYPE-DRIVEN OBJECTIVES
  // =============================================
  const globalLevel = (world - 1) * LEVELS_PER_WORLD + level;
  const timerSeconds = Math.max(80, Math.round(getTimerDuration(world) * archetypeConfig.timerMultiplier));
  const LONG_WORD_LENGTH = 5;

  // --- PRIMARY OBJECTIVE (driven by archetype) ---
  switch (archetypeConfig.primaryObjective) {
    case 'clearIce': {
      // Excavation: clear a target number of ice tiles
      const baseIce = world <= 2 ? 3 : world <= 5 ? 5 : 7;
      const target = Math.min(baseIce + Math.floor(level / 2), 15);
      objectives.push({
        type: OBJECTIVE_TYPES.CLEAR_ICE as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }

    case 'scoreTarget': {
      // Gold Rush: high score target (compensated by gold-heavy board)
      const AVERAGE_WORD_SCORE = 65;
      const estimatedWordsInTime = timerSeconds / 5;
      const difficultyFactor = 0.4 + (world - 1) * (0.7 / 9);
      const levelBonus = 1 + (globalLevel - 1) * 0.015;
      // Gold Rush gets a score boost since the board is loaded with multipliers
      const archetypeBoost = effectiveArchetype === 'forge' ? 1.4 : 1;
      const worldCap = Math.round(1500 + (world - 1) * (1500 / 9));
      const target = Math.min(
        Math.round(estimatedWordsInTime * AVERAGE_WORD_SCORE * difficultyFactor * levelBonus * archetypeBoost),
        worldCap
      );
      objectives.push({
        type: OBJECTIVE_TYPES.SCORE_TARGET as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }

    case 'longWords': {
      // Puzzle: find N long words (5+ letters)
      const gridSupportsLongWords = !grid || hasPathOfLength(grid, LONG_WORD_LENGTH);
      if (gridSupportsLongWords) {
        const base = world <= 3 ? 2 : world <= 6 ? 3 : 4;
        const target = Math.min(base + Math.floor(level / 3), 7);
        objectives.push({
          type: OBJECTIVE_TYPES.LONG_WORDS as ObjectiveType,
          target,
          isPrimary: true,
        });
      } else {
        // Fallback if grid can't support long paths
        const target = Math.min(5 + Math.floor(globalLevel / 5), 15);
        objectives.push({
          type: OBJECTIVE_TYPES.WORD_COUNT as ObjectiveType,
          target,
          isPrimary: true,
        });
      }
      break;
    }

    case 'timeBonus': {
      // Survival: finish with N seconds remaining despite short timer
      // Target is a % of the (already reduced) timer
      const target = Math.max(Math.round(timerSeconds * 0.25), 10);
      objectives.push({
        type: OBJECTIVE_TYPES.TIME_BONUS as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }

    case 'wordCount':
    default: {
      // Standard / Cascade: find N words
      const baseWords = world <= 1 ? 5 : world <= 2 ? 6 : world <= 3 ? 7 : 8;
      // Cascade gets a higher word count (chains help find more words)
      const archetypeBoost = effectiveArchetype === 'blast' ? 1.2 : 1;
      let target = Math.min(
        Math.round((baseWords + Math.floor(globalLevel / 5) * 2) * archetypeBoost),
        25
      );
      const maxReasonableWords = Math.floor((timerSeconds / 4) * 0.8);
      target = Math.min(target, maxReasonableWords);
      target = Math.max(4, target);
      objectives.push({
        type: OBJECTIVE_TYPES.WORD_COUNT as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }
  }

  // --- SECONDARY OBJECTIVES (archetype-aware) ---

  // Secondary 1: from archetype's preferred secondaries
  const secondaries = archetypeConfig.secondaryObjectives;
  const primaryType = objectives[0].type;

  for (const secType of secondaries) {
    // Skip if same as primary
    if (secType === primaryType) continue;
    // Skip boss-only objectives on regular levels
    if (secType === 'mechanicTrigger' || secType === 'surviveBattle') continue;
    // Skip longWords if grid can't support long paths
    if (secType === 'longWords' && grid && !hasPathOfLength(grid, LONG_WORD_LENGTH)) continue;

    const target = generateSecondaryTarget(secType, world, level, timerSeconds, globalLevel);
    if (target > 0) {
      objectives.push({
        type: secType as ObjectiveType,
        target,
        isPrimary: false,
      });
      break; // Only add first valid secondary from archetype
    }
  }

  // Secondary 2: World mechanic trigger (world 2+), or fallback secondary for W1
  const worldConfig = WORLD_CONFIGS[world - 1];
  if (worldConfig?.mechanic) {
    const mechanicTarget = Math.min(1 + Math.floor((world - 1) / 2), 4);
    objectives.push({
      type: OBJECTIVE_TYPES.MECHANIC_TRIGGER as ObjectiveType,
      target: mechanicTarget,
      isPrimary: false,
    });
  } else {
    // Worlds without a mechanic (W1) get a second archetype secondary
    // to ensure 3-star is achievable (need 2 secondaries for 3 stars)
    const usedTypes = new Set(objectives.map(o => o.type));
    const fallbackOrder: ObjectiveType[] = ['scoreTarget', 'longWords', 'wordCount', 'timeBonus'];
    for (const fbType of fallbackOrder) {
      if (usedTypes.has(fbType)) continue;
      if (fbType === 'longWords' && grid && !hasPathOfLength(grid, LONG_WORD_LENGTH)) continue;
      const target = generateSecondaryTarget(fbType, world, level, timerSeconds, globalLevel);
      if (target > 0) {
        objectives.push({ type: fbType as ObjectiveType, target, isPrimary: false });
        break;
      }
    }
  }

  return objectives;
}

/**
 * Generate a target value for a secondary objective type.
 * Shared helper to keep secondary objective scaling consistent.
 */
function generateSecondaryTarget(
  type: ObjectiveType,
  world: number,
  level: number,
  timerSeconds: number,
  _globalLevel: number
): number {
  const worldEase = world <= 2 ? 0.5 : world <= 4 ? 0.6 : 0.7;

  switch (type) {
    case 'scoreTarget': {
      const estimatedWords = timerSeconds / 5;
      const factor = 0.5 + (world - 1) * (0.6 / 9);
      return Math.max(Math.round(estimatedWords * 65 * factor * worldEase), 200);
    }
    case 'wordCount': {
      const estimatedWords = timerSeconds / 5;
      return Math.max(Math.round(estimatedWords * worldEase), 3);
    }
    case 'longWords': {
      return Math.min(1 + Math.floor((level - 1) / 2), 5);
    }
    case 'clearIce': {
      return world >= 2 ? Math.min(2 + Math.floor(level / 3), 8) : 0;
    }
    case 'timeBonus': {
      return Math.max(Math.round(timerSeconds * 0.1), 10);
    }
    case 'collectGems': {
      return world >= 2 ? Math.min(2 + Math.floor((world - 2) / 3), 3) : 0;
    }
    default:
      return 0;
  }
}

// ==============================================
// SPECIAL TILE GENERATION
// ==============================================

/** Set of vowels for ice tile protection (case-insensitive check) */
const VOWEL_SET = new Set(VOWELS.map((v) => v.toUpperCase()));

/**
 * Check if a letter is a vowel (supports multiple languages)
 * Ice tiles should not be placed on vowels to ensure levels are completable.
 */
function isVowel(letter: string): boolean {
  return VOWEL_SET.has(letter.toUpperCase());
}

/**
 * Generate special tiles for a level
 *
 * @param world - World number
 * @param level - Level within world
 * @param gridSize - Size of the grid (4-7)
 * @param grid - Optional letter grid for vowel protection (ice tiles won't be placed on vowels)
 * @returns Array of special tile positions
 */
export function generateSpecialTiles(
  world: number,
  level: number,
  gridSize: number,
  grid?: string[][],
  archetype?: LevelArchetype
): SpecialTile[] {
  const effectiveArchetype = archetype ?? getArchetypeForLevel(world, level);
  const { tileModifiers } = getArchetypeConfig(effectiveArchetype);
  const tiles: SpecialTile[] = [];
  const usedPositions = new Set<string>();

  /**
   * Add a tile at a random unique position
   * For ice tiles, avoids placing on vowels when grid is provided
   */
  const addTile = (type: TileType): void => {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      const posKey = `${row},${col}`;

      // Skip if position already used
      if (usedPositions.has(posKey)) {
        attempts++;
        continue;
      }

      // Vowel protection: Ice tiles should not be placed on vowels
      // This prevents RNG-based unfair levels where critical vowels are frozen
      if (type === 'ice' && grid) {
        const letter = grid[row]?.[col];
        if (letter && isVowel(letter)) {
          attempts++;
          continue; // Skip vowel positions for ice tiles
        }
      }

      usedPositions.add(posKey);
      tiles.push({ row, col, type });
      return;
    }
  };

  // World 1: No special tiles for levels 1-4 (tutorial chapters 1-2)
  // Introduce gold tiles in boss chapter (levels 5-7)
  if (world === 1 && level < 5) {
    return tiles;
  }

  // Cap: max ~25% of grid can be special tiles
  const maxSpecialTiles = Math.floor(gridSize * gridSize * 0.25);

  // Gold tiles: World 1 level 5+ (boss chapter), World 2+ all levels
  if ((world === 1 && level >= 5) || world >= 2) {
    const baseGold = Math.min(1 + Math.floor((world - 1) / 2), 3);
    const goldCount = Math.min(Math.round(baseGold * tileModifiers.goldMultiplier), 3);
    for (let i = 0; i < goldCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.GOLD as TileType);
    }
  }

  // Ice tiles: World 2+ (or any world if archetype demands it)
  if (world >= 2 || tileModifiers.iceMultiplier > 1) {
    const baseIce = Math.min(1 + Math.floor(level / 3) + Math.floor((Math.max(world, 2) - 2) / 2), 4);
    const iceCount = Math.min(Math.round(baseIce * tileModifiers.iceMultiplier), 5);
    for (let i = 0; i < iceCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.ICE as TileType);
    }
  }

  // Bomb tiles: World 3+, level 3+
  if (world >= 3 && level >= 3) {
    const bombCount = Math.min(Math.round(1 * tileModifiers.bombMultiplier), 2);
    for (let i = 0; i < bombCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.BOMB as TileType);
    }
  }

  // Time tiles: World 3+, level 2+ — strategic lifeline (+5s each)
  if (world >= 3 && level >= 2) {
    const baseTime = level >= 5 ? 2 : 1;
    const timeCount = Math.min(Math.round(baseTime * tileModifiers.timeMultiplier), 2);
    for (let i = 0; i < timeCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.TIME as TileType);
    }
  }

  return tiles;
}

/**
 * Apply Gem Detector upgrade boost to special tiles.
 * - specialTileBoost (T1-2): adds extra gold tiles proportional to boost %
 * - guaranteedGoldTile (T3): ensures at least 1 gold tile after cascade
 *
 * Called at game init time (after upgrade effects are available).
 */
export function applyGemDetectorBoost(
  tiles: SpecialTile[],
  gridSize: number,
  specialTileBoost: number,
  guaranteedGoldTile: boolean
): SpecialTile[] {
  if (specialTileBoost <= 0 && !guaranteedGoldTile) return tiles;

  const result = [...tiles];
  const usedPositions = new Set(tiles.map(t => `${t.row},${t.col}`));

  const addGoldTile = (): boolean => {
    let attempts = 0;
    while (attempts < 100) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      const posKey = `${row},${col}`;
      if (!usedPositions.has(posKey)) {
        usedPositions.add(posKey);
        result.push({ row, col, type: TILE_TYPES.GOLD as TileType });
        return true;
      }
      attempts++;
    }
    return false;
  };

  // specialTileBoost: add extra gold tiles (e.g. 0.2 = +20% → ~1 extra, 0.3 = ~1-2 extra)
  if (specialTileBoost > 0) {
    const currentGoldCount = tiles.filter(t => t.type === 'gold').length;
    const extraGold = Math.max(1, Math.round(currentGoldCount * specialTileBoost));
    for (let i = 0; i < extraGold; i++) {
      addGoldTile();
    }
  }

  // guaranteedGoldTile: ensure at least 1 gold tile exists
  if (guaranteedGoldTile) {
    const hasGold = result.some(t => t.type === 'gold');
    if (!hasGold) {
      addGoldTile();
    }
  }

  return result;
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

  // Validate level (world=0 is endless mode — unbounded floors)
  if (config.world !== 0 && (config.level < 1 || config.level > LEVELS_PER_WORLD)) {
    errors.push('Invalid level: must be 1-7');
  } else if (config.world === 0 && config.level < 1) {
    errors.push('Invalid endless floor: must be >= 1');
  }

  // Validate grid size
  if (![4, 5, 6, 7].includes(config.gridSize)) {
    errors.push('Invalid grid size: must be 4, 5, 6, or 7');
  }

  // Validate timer — 0 is allowed for non-timer archetypes (blast = move-limited, hunt = life-based)
  if (config.timerSeconds < 0) {
    errors.push('Invalid timer: must be >= 0');
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
