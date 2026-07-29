/**
 * Level Archetypes
 *
 * Defines distinct gameplay flavors for adventure levels. Each archetype
 * modifies the game engine's parameters (objectives, tiles, timer) to create
 * a unique feel from the same core Boggle mechanic.
 *
 * Archetypes replace the old mechanical odd/even objective alternation with
 * curated per-level identities that follow good pacing principles.
 */

import type { LevelArchetype, ObjectiveType } from '@/types/adventure';
import { WORLDS_COUNT, LEVELS_PER_WORLD } from './constants';

// ==============================================
// ARCHETYPE CONFIGURATION
// ==============================================

/**
 * Tile generation multipliers for an archetype.
 * Applied to the base tile counts from generateSpecialTiles.
 * 0 = suppress entirely, 1 = normal, 2 = double, etc.
 */
export interface TileModifiers {
  goldMultiplier: number;
  iceMultiplier: number;
  bombMultiplier: number;
  timeMultiplier: number;
}

/**
 * Full configuration for a level archetype.
 */
export interface ArchetypeConfig {
  /** Primary objective type driven by this archetype */
  primaryObjective: ObjectiveType;
  /** Timer multiplier (< 1 = shorter, > 1 = longer) */
  timerMultiplier: number;
  /** Tile spawn multipliers */
  tileModifiers: TileModifiers;
  /** Translation key for archetype name */
  nameKey: string;
  /** Human-readable description (for dev reference) */
  description: string;
  /** Secondary objective types this archetype favors */
  secondaryObjectives: ObjectiveType[];
}

const NEUTRAL_TILES: TileModifiers = {
  goldMultiplier: 1,
  iceMultiplier: 1,
  bombMultiplier: 1,
  timeMultiplier: 1,
};

/**
 * Archetype definitions — each maps to a real game mode.
 */
export const ARCHETYPE_CONFIGS: Record<LevelArchetype, ArchetypeConfig> = {
  classic: {
    primaryObjective: 'wordCount',
    timerMultiplier: 1.0,
    tileModifiers: { ...NEUTRAL_TILES },
    nameKey: 'adventure.archetype.classic',
    description: 'Standard Boggle - find words on grid with timer and combo system.',
    secondaryObjectives: ['scoreTarget', 'longWords'],
  },

  blast: {
    primaryObjective: 'clearIce',
    // 0 signals move-limited mode (not time-limited)
    timerMultiplier: 0,
    tileModifiers: {
      goldMultiplier: 1.5,
      iceMultiplier: 2.5,
      bombMultiplier: 2,
      timeMultiplier: 0, // no time tiles in move mode
    },
    nameKey: 'adventure.archetype.blast',
    description: 'Tile-clearing puzzle with gravity and cascades. Move-limited.',
    secondaryObjectives: ['wordCount', 'scoreTarget'],
  },

  hunt: {
    primaryObjective: 'wordCount',
    // 0 signals life-based mode (not timer-based)
    timerMultiplier: 0,
    tileModifiers: {
      goldMultiplier: 0.5,
      iceMultiplier: 0,
      bombMultiplier: 0,
      timeMultiplier: 0,
    },
    nameKey: 'adventure.archetype.hunt',
    description: 'Hidden target word with Wordle-style clues. Life bar instead of timer.',
    secondaryObjectives: ['scoreTarget', 'longWords'],
  },

  wheel: {
    primaryObjective: 'wordCount',
    timerMultiplier: 0.7,
    tileModifiers: {
      goldMultiplier: 1,
      iceMultiplier: 0,
      bombMultiplier: 0,
      timeMultiplier: 1.5,
    },
    nameKey: 'adventure.archetype.wheel',
    description: 'Center letter mandatory - all words must include it. Circular UI overlay.',
    secondaryObjectives: ['longWords', 'scoreTarget'],
  },

  forge: {
    primaryObjective: 'scoreTarget',
    timerMultiplier: 0.8,
    tileModifiers: {
      goldMultiplier: 2,
      iceMultiplier: 1,
      bombMultiplier: 1.5,
      timeMultiplier: 1,
    },
    nameKey: 'adventure.archetype.forge',
    description: 'Score target with rune modifiers. Pick a rune before the level.',
    secondaryObjectives: ['wordCount', 'longWords'],
  },

  boss: {
    primaryObjective: 'defeatBoss',
    timerMultiplier: 1,
    tileModifiers: { ...NEUTRAL_TILES },
    nameKey: 'adventure.archetype.boss',
    description: 'Boss battle with HP, phases, and twist mechanics.',
    secondaryObjectives: ['mechanicTrigger', 'surviveBattle'],
  },
};

// ==============================================
// WORLD ARCHETYPE MAPS
// ==============================================

/**
 * Hand-curated archetype assignments per world.
 * Array index = level - 1 (so [0] = level 1, [6] = level 7/boss).
 *
 * Design principles:
 * - No two consecutive levels share an archetype (worlds 3+)
 * - World 1-2: mostly standard with gentle introductions
 * - Later worlds: full variety with all archetypes represented
 * - Boss (level 7) is always 'boss'
 * - Pacing follows teach → practice → twist → challenge → rest → surprise → boss
 */
export const WORLD_ARCHETYPE_MAPS: Record<number, LevelArchetype[]> = {
  // World 1: Tutorial — all classic, gentle introduction
  1: ['classic', 'classic', 'classic', 'classic', 'classic', 'classic', 'boss'],

  // World 2: Intro modes — first blast and wheel taste
  2: ['classic', 'classic', 'blast', 'classic', 'wheel', 'classic', 'boss'],

  // World 3: Full variety begins
  3: ['classic', 'blast', 'hunt', 'wheel', 'classic', 'forge', 'boss'],

  // World 4
  4: ['classic', 'wheel', 'blast', 'forge', 'hunt', 'classic', 'boss'],

  // World 5
  5: ['blast', 'classic', 'forge', 'hunt', 'classic', 'wheel', 'boss'],

  // World 6
  6: ['hunt', 'forge', 'classic', 'blast', 'wheel', 'classic', 'boss'],

  // World 7
  7: ['forge', 'classic', 'wheel', 'hunt', 'blast', 'classic', 'boss'],

  // World 8
  8: ['classic', 'hunt', 'blast', 'forge', 'wheel', 'hunt', 'boss'],

  // World 9
  9: ['wheel', 'blast', 'forge', 'classic', 'hunt', 'forge', 'boss'],

  // World 10: Final world — maximum variety and challenge
  10: ['blast', 'hunt', 'wheel', 'forge', 'classic', 'hunt', 'boss'],
};

// ==============================================
// PUBLIC API
// ==============================================

/**
 * Get the archetype assigned to a specific level.
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-7)
 * @returns The archetype for this level
 * @throws Error if world or level is out of range
 */
export function getArchetypeForLevel(world: number, level: number): LevelArchetype {
  if (world < 1 || world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${world}. Must be 1-${WORLDS_COUNT}.`);
  }
  if (level < 1 || level > LEVELS_PER_WORLD) {
    throw new Error(`Invalid level: ${level}. Must be 1-${LEVELS_PER_WORLD}.`);
  }
  return WORLD_ARCHETYPE_MAPS[world][level - 1];
}

/**
 * Get the full configuration for an archetype.
 *
 * @param archetype - The archetype identifier
 * @returns Full archetype config with objectives, tiles, and timer modifiers
 */
export function getArchetypeConfig(archetype: LevelArchetype): ArchetypeConfig {
  return ARCHETYPE_CONFIGS[archetype];
}
