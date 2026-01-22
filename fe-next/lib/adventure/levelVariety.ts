/**
 * Adventure Mode Level Variety Configuration
 *
 * Defines what's unique about each level in Worlds 1-3 to provide
 * progressive variety and keep players engaged.
 *
 * Each level can introduce new mechanics, have unique visual themes,
 * and build on previous levels to create a cohesive learning curve.
 */

// ==============================================
// TYPES
// ==============================================

/**
 * Entry animation types for level transitions
 * - cascade: Tiles fall in from top in sequence
 * - spiral: Tiles appear in spiral pattern from center
 * - explode: Tiles burst outward from center
 * - fade: Simple fade in (gentler for tutorial)
 * - wave: Tiles appear in wave pattern
 */
export type EntryAnimationType =
  | 'cascade'
  | 'spiral'
  | 'explode'
  | 'fade'
  | 'wave';

/**
 * Atmosphere visual elements that can be shown during gameplay
 * Grouped by world theme
 */
export type AtmosphereElement =
  // World 1 - Alphabet Meadows (pastoral/nature)
  | 'floatingLetters'
  | 'butterflies'
  | 'grassSway'
  | 'sunRays'
  // World 2 - Synonym Springs (water/springs)
  | 'waterDroplets'
  | 'ripples'
  | 'mist'
  | 'sparkles'
  // World 3 - Root Caverns (caves/crystals)
  | 'crystalSparkle'
  | 'torchFlicker'
  | 'caveDust'
  | 'glowingRunes';

/**
 * Special events that can occur on milestone levels
 */
export type SpecialEvent =
  | 'hiddenWordChallenge'
  | 'worldBossHint'
  | 'comboChallenge'
  | 'timeTrial';

/**
 * What a level can introduce (new mechanics/features)
 */
export type LevelIntroduction =
  // World 1 introductions
  | 'basicGameplay'
  | 'scoringSystem'
  | 'longWordsObjective'
  | 'comboSystem'
  | 'timePressure'
  | 'goldTiles'
  | 'bonusWords'
  // World 2 introductions
  | 'synonymMechanic'
  | 'iceTiles'
  | 'clearIceObjective'
  | 'chainReactions'
  // World 3 introductions
  | 'etymologyMechanic'
  | 'bombTiles'
  | 'timeBonusObjective'
  | 'cascadeEffects';

/**
 * Configuration for a single level's variety
 */
export interface LevelVariety {
  /** World number (1-10) */
  world: number;
  /** Level number within world (1-10) */
  level: number;
  /** What new mechanic/element this level introduces */
  introduces?: LevelIntroduction;
  /** Entry animation style for this level */
  entryAnimation: EntryAnimationType;
  /** Atmosphere elements to display during gameplay */
  atmosphere: AtmosphereElement[];
  /** Whether this is a milestone level (5 or 10) */
  isMilestone: boolean;
  /** Special event for milestone levels */
  specialEvent?: SpecialEvent;
  /** Visual theme variation for this level */
  visualTheme?: string;
}

// ==============================================
// WORLD 1: ALPHABET MEADOWS
// Tutorial world - introduces basic gameplay progressively
// ==============================================

export const LEVEL_VARIETY_WORLD_1: LevelVariety[] = [
  {
    world: 1,
    level: 1,
    introduces: 'basicGameplay',
    entryAnimation: 'fade',
    atmosphere: ['sunRays'],
    isMilestone: false,
    visualTheme: 'morning-meadow',
  },
  {
    world: 1,
    level: 2,
    introduces: 'scoringSystem',
    entryAnimation: 'fade',
    atmosphere: ['sunRays', 'grassSway'],
    isMilestone: false,
    visualTheme: 'sunny-meadow',
  },
  {
    world: 1,
    level: 3,
    introduces: 'longWordsObjective',
    entryAnimation: 'cascade',
    atmosphere: ['sunRays', 'grassSway'],
    isMilestone: false,
    visualTheme: 'flower-meadow',
  },
  {
    world: 1,
    level: 4,
    introduces: 'comboSystem',
    entryAnimation: 'cascade',
    atmosphere: ['sunRays', 'grassSway', 'butterflies'],
    isMilestone: false,
    visualTheme: 'butterfly-garden',
  },
  {
    world: 1,
    level: 5,
    introduces: 'timePressure',
    entryAnimation: 'wave',
    atmosphere: ['sunRays', 'grassSway', 'butterflies', 'floatingLetters'],
    isMilestone: true,
    specialEvent: 'hiddenWordChallenge',
    visualTheme: 'golden-hour',
  },
  {
    world: 1,
    level: 6,
    entryAnimation: 'cascade',
    atmosphere: ['sunRays', 'grassSway', 'butterflies'],
    isMilestone: false,
    visualTheme: 'afternoon-meadow',
  },
  {
    world: 1,
    level: 7,
    introduces: 'bonusWords',
    entryAnimation: 'wave',
    atmosphere: ['sunRays', 'grassSway', 'butterflies', 'floatingLetters'],
    isMilestone: false,
    visualTheme: 'rainbow-meadow',
  },
  {
    world: 1,
    level: 8,
    introduces: 'goldTiles',
    entryAnimation: 'spiral',
    atmosphere: ['sunRays', 'grassSway', 'butterflies', 'floatingLetters'],
    isMilestone: false,
    visualTheme: 'treasure-meadow',
  },
  {
    world: 1,
    level: 9,
    entryAnimation: 'spiral',
    atmosphere: ['sunRays', 'grassSway', 'butterflies', 'floatingLetters'],
    isMilestone: false,
    visualTheme: 'sunset-meadow',
  },
  {
    world: 1,
    level: 10,
    entryAnimation: 'explode',
    atmosphere: ['sunRays', 'grassSway', 'butterflies', 'floatingLetters'],
    isMilestone: true,
    specialEvent: 'worldBossHint',
    visualTheme: 'starlit-meadow',
  },
];

// ==============================================
// WORLD 2: SYNONYM SPRINGS
// Introduces synonym mechanic and ice tiles
// ==============================================

export const LEVEL_VARIETY_WORLD_2: LevelVariety[] = [
  {
    world: 2,
    level: 1,
    introduces: 'synonymMechanic',
    entryAnimation: 'wave',
    atmosphere: ['waterDroplets', 'mist'],
    isMilestone: false,
    visualTheme: 'spring-source',
  },
  {
    world: 2,
    level: 2,
    introduces: 'iceTiles',
    entryAnimation: 'wave',
    atmosphere: ['waterDroplets', 'mist', 'sparkles'],
    isMilestone: false,
    visualTheme: 'frozen-spring',
  },
  {
    world: 2,
    level: 3,
    introduces: 'clearIceObjective',
    entryAnimation: 'cascade',
    atmosphere: ['waterDroplets', 'mist', 'sparkles'],
    isMilestone: false,
    visualTheme: 'thawing-spring',
  },
  {
    world: 2,
    level: 4,
    introduces: 'chainReactions',
    entryAnimation: 'cascade',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: false,
    visualTheme: 'cascading-falls',
  },
  {
    world: 2,
    level: 5,
    entryAnimation: 'spiral',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: true,
    specialEvent: 'hiddenWordChallenge',
    visualTheme: 'crystal-pool',
  },
  {
    world: 2,
    level: 6,
    entryAnimation: 'wave',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: false,
    visualTheme: 'rushing-rapids',
  },
  {
    world: 2,
    level: 7,
    entryAnimation: 'wave',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: false,
    visualTheme: 'misty-grotto',
  },
  {
    world: 2,
    level: 8,
    entryAnimation: 'spiral',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: false,
    visualTheme: 'rainbow-falls',
  },
  {
    world: 2,
    level: 9,
    entryAnimation: 'spiral',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: false,
    visualTheme: 'deep-springs',
  },
  {
    world: 2,
    level: 10,
    entryAnimation: 'explode',
    atmosphere: ['waterDroplets', 'mist', 'sparkles', 'ripples'],
    isMilestone: true,
    specialEvent: 'worldBossHint',
    visualTheme: 'spellingbee-lair',
  },
];

// ==============================================
// WORLD 3: ROOT CAVERNS
// Introduces etymology mechanic and bomb tiles
// ==============================================

export const LEVEL_VARIETY_WORLD_3: LevelVariety[] = [
  {
    world: 3,
    level: 1,
    introduces: 'etymologyMechanic',
    entryAnimation: 'fade',
    atmosphere: ['torchFlicker', 'caveDust'],
    isMilestone: false,
    visualTheme: 'cave-entrance',
  },
  {
    world: 3,
    level: 2,
    entryAnimation: 'cascade',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle'],
    isMilestone: false,
    visualTheme: 'crystal-corridor',
  },
  {
    world: 3,
    level: 3,
    introduces: 'bombTiles',
    entryAnimation: 'cascade',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle'],
    isMilestone: false,
    visualTheme: 'danger-chamber',
  },
  {
    world: 3,
    level: 4,
    introduces: 'cascadeEffects',
    entryAnimation: 'spiral',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: false,
    visualTheme: 'rune-chamber',
  },
  {
    world: 3,
    level: 5,
    entryAnimation: 'spiral',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: true,
    specialEvent: 'hiddenWordChallenge',
    visualTheme: 'ancient-library',
  },
  {
    world: 3,
    level: 6,
    entryAnimation: 'wave',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: false,
    visualTheme: 'echo-cavern',
  },
  {
    world: 3,
    level: 7,
    introduces: 'timeBonusObjective',
    entryAnimation: 'wave',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: false,
    visualTheme: 'hourglass-room',
  },
  {
    world: 3,
    level: 8,
    entryAnimation: 'spiral',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: false,
    visualTheme: 'gem-vault',
  },
  {
    world: 3,
    level: 9,
    entryAnimation: 'explode',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: false,
    visualTheme: 'deepest-cavern',
  },
  {
    world: 3,
    level: 10,
    entryAnimation: 'explode',
    atmosphere: ['torchFlicker', 'caveDust', 'crystalSparkle', 'glowingRunes'],
    isMilestone: true,
    specialEvent: 'worldBossHint',
    visualTheme: 'thesaurus-throne',
  },
];

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Get level variety configuration for a specific world/level
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-10)
 * @returns Level variety config or undefined if not configured
 */
export function getLevelVariety(
  world: number,
  level: number
): LevelVariety | undefined {
  if (level < 1 || level > 10) {
    return undefined;
  }

  const config = getWorldVarietyConfig(world);
  if (config.length === 0) {
    return undefined;
  }

  return config[level - 1];
}

/**
 * Get what a level introduces (new mechanic/feature)
 *
 * @param world - World number
 * @param level - Level number
 * @returns Introduction key or undefined
 */
export function getLevelIntroduces(
  world: number,
  level: number
): LevelIntroduction | undefined {
  const variety = getLevelVariety(world, level);
  return variety?.introduces;
}

/**
 * Get entry animation type for a level
 *
 * @param world - World number
 * @param level - Level number
 * @returns Entry animation type (defaults to 'cascade')
 */
export function getLevelEntryAnimation(
  world: number,
  level: number
): EntryAnimationType {
  const variety = getLevelVariety(world, level);
  return variety?.entryAnimation ?? 'cascade';
}

/**
 * Get atmosphere elements for a level
 *
 * @param world - World number
 * @param level - Level number
 * @returns Array of atmosphere elements (empty if not configured)
 */
export function getLevelAtmosphere(
  world: number,
  level: number
): AtmosphereElement[] {
  const variety = getLevelVariety(world, level);
  return variety?.atmosphere ?? [];
}

/**
 * Check if a level is a milestone level (5 or 10)
 *
 * @param world - World number
 * @param level - Level number
 * @returns True if milestone level
 */
export function isMilestoneLevel(world: number, level: number): boolean {
  const variety = getLevelVariety(world, level);
  return variety?.isMilestone ?? false;
}

/**
 * Get all variety configs for a specific world
 *
 * @param world - World number (1-10)
 * @returns Array of level variety configs (empty if world not configured)
 */
export function getWorldVarietyConfig(world: number): LevelVariety[] {
  switch (world) {
    case 1:
      return LEVEL_VARIETY_WORLD_1;
    case 2:
      return LEVEL_VARIETY_WORLD_2;
    case 3:
      return LEVEL_VARIETY_WORLD_3;
    default:
      // Worlds 4-10 not yet configured
      return [];
  }
}
