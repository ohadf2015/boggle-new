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
 * Archetype definitions — each creates a distinct gameplay experience.
 */
export const ARCHETYPE_CONFIGS: Record<LevelArchetype, ArchetypeConfig> = {
  standard: {
    primaryObjective: 'wordCount',
    timerMultiplier: 1,
    tileModifiers: { ...NEUTRAL_TILES },
    nameKey: 'adventure.archetype.standard',
    description: 'Balanced word-finding. The baseline Boggle experience.',
    secondaryObjectives: ['scoreTarget', 'longWords'],
  },

  excavation: {
    primaryObjective: 'clearIce',
    timerMultiplier: 1.15,
    tileModifiers: {
      ...NEUTRAL_TILES,
      iceMultiplier: 2.5,
      goldMultiplier: 0.5,
      bombMultiplier: 2,
    },
    nameKey: 'adventure.archetype.excavation',
    description: 'Board heavily iced. Chip away strategically to reveal letters.',
    secondaryObjectives: ['wordCount', 'scoreTarget'],
  },

  goldRush: {
    primaryObjective: 'scoreTarget',
    timerMultiplier: 0.7,
    tileModifiers: {
      ...NEUTRAL_TILES,
      goldMultiplier: 3,
      iceMultiplier: 0,
    },
    nameKey: 'adventure.archetype.goldRush',
    description: 'Gold-loaded board, short timer. Maximize value per word.',
    secondaryObjectives: ['collectGems', 'longWords'],
  },

  puzzle: {
    primaryObjective: 'longWords',
    timerMultiplier: 1.3,
    tileModifiers: {
      ...NEUTRAL_TILES,
      iceMultiplier: 0,
      bombMultiplier: 0,
    },
    nameKey: 'adventure.archetype.puzzle',
    description: 'Find specific long or hidden words. Brain teaser.',
    secondaryObjectives: ['wordCount', 'scoreTarget'],
  },

  survival: {
    primaryObjective: 'timeBonus',
    timerMultiplier: 0.6,
    tileModifiers: {
      ...NEUTRAL_TILES,
      timeMultiplier: 3,
      iceMultiplier: 1.5,
      goldMultiplier: 0.5,
    },
    nameKey: 'adventure.archetype.survival',
    description: 'Timer drains fast. Time tiles are your lifeline.',
    secondaryObjectives: ['wordCount', 'scoreTarget'],
  },

  cascade: {
    primaryObjective: 'wordCount',
    timerMultiplier: 0.9,
    tileModifiers: {
      ...NEUTRAL_TILES,
      bombMultiplier: 2,
      goldMultiplier: 1.5,
    },
    nameKey: 'adventure.archetype.cascade',
    description: 'Aggressive board reshuffling. Bombs and combos matter.',
    secondaryObjectives: ['scoreTarget', 'collectGems'],
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
  // World 1: Tutorial — gentle introduction
  1: ['standard', 'standard', 'standard', 'standard', 'standard', 'standard', 'boss'],

  // World 2: Ice introduced — first excavation taste
  2: ['standard', 'standard', 'excavation', 'standard', 'standard', 'excavation', 'boss'],

  // World 3: Full variety begins
  3: ['standard', 'excavation', 'goldRush', 'survival', 'standard', 'puzzle', 'boss'],

  // World 4: Idiom world — puzzle-heavy
  4: ['standard', 'puzzle', 'excavation', 'cascade', 'goldRush', 'survival', 'boss'],

  // World 5: Compound Canyon — cascade combos shine
  5: ['standard', 'excavation', 'goldRush', 'survival', 'cascade', 'puzzle', 'boss'],

  // World 6: Anagram Labyrinth — puzzle + survival pressure
  6: ['excavation', 'goldRush', 'puzzle', 'cascade', 'survival', 'standard', 'boss'],

  // World 7: Mirror Palace — strategic variety
  7: ['goldRush', 'survival', 'standard', 'excavation', 'puzzle', 'cascade', 'boss'],

  // World 8: Nebula — all archetypes, harder tuning
  8: ['survival', 'cascade', 'excavation', 'goldRush', 'standard', 'puzzle', 'boss'],

  // World 9: Polyglot Peaks — pressure mounts
  9: ['cascade', 'puzzle', 'goldRush', 'standard', 'excavation', 'survival', 'boss'],

  // World 10: Final world — every archetype, maximum challenge
  10: ['excavation', 'survival', 'cascade', 'puzzle', 'goldRush', 'standard', 'boss'],
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
