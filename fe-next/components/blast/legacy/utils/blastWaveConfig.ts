/**
 * blastWaveConfig — Pure scaling functions for multi-round wave system.
 * No React dependencies — trivially testable.
 *
 * Inspired by Candy Crush "complexity staircase":
 * parameters ramp difficulty gradually, with new mechanics unlocking at milestones.
 *
 * Tile unlock progression:
 * Wave 1: bomb, ice, gold, rainbow (basics)
 * Wave 2: + treasure gem
 * Wave 3: + prism
 * Wave 4: + lightning
 * Wave 5: + diamond
 * Wave 6: + frost
 * Wave 7: + vortex (magnet)
 * Wave 8: + catalyst, anchor (long-word reward)
 * Wave 9: + countdown, fuse
 * Wave 10: + shuffle
 * Wave 11: + magma, portal
 * Wave 12+: + crystal (everything)
 */

/**
 * Wave archetype — pure metadata tag used by the UI layer to pick mascot art,
 * wave-intro copy, and results flavor. The engine does NOT read this field;
 * difficulty still flows from the numeric fields below. Archetypes exist only
 * to give each wave an emotional identity ("it's a score rush!") without
 * re-tuning balance.
 *
 * - normal:       baseline pacing, no special flavor
 * - scoreRush:    combo/multiplier-friendly, big-swing wave
 * - treasureHunt: new collectible tile unlock, encourages hunting
 * - survival:     tight moves / hostile tiles, endurance test
 * - silence:      reserved for future quiet/meditative waves
 */
export type BlastWaveArchetype =
  | 'normal'
  | 'scoreRush'
  | 'treasureHunt'
  | 'survival'
  | 'silence';

export interface WaveConfig {
  /** Emotional identity tag — UI only, ignored by the engine */
  archetype: BlastWaveArchetype;
  /** Exotic specials allowed to spawn this wave (undefined = no filtering).
   * Core specials (bomb/ice/gold/rainbow) always spawn. Filled from
   * getFeaturedSpecialsForWave so waves >12 keep rotating. */
  featuredSpecials?: readonly BlastTileType[];
  /** Minimum word length for player submissions */
  minWordLength: number;
  /** Chance of a cell being special (0-1) */
  specialTileChance: number;
  /** Ice tile distribution (share of special tiles) */
  iceDistribution: number;
  /** Gold tile distribution (share of special tiles) */
  goldDistribution: number;
  /** Vowel frequency modifier (1.0 = normal, lower = fewer vowels) */
  vowelModifier: number;
  /** Max cascade chain depth */
  maxCascadeChain: number;
  /** Cascade chain bonus multiplier */
  cascadeChainBonus: number;
  /** Score threshold to advance to next wave (undefined = no threshold) */
  scoreThreshold: number | undefined;
  /** Whether lightning tiles can appear */
  lightningEnabled: boolean;
  /** Whether vortex (formerly magnet) tiles can appear */
  vortexEnabled: boolean;
  /** @deprecated Use vortexEnabled. Kept for backward compatibility. */
  magnetEnabled: boolean;
  /** Whether treasure gem tiles can appear */
  gemEnabled: boolean;
  /** Whether prism tiles can appear */
  prismEnabled: boolean;
  /** Whether frost (formerly frozen) tiles can appear */
  frostEnabled: boolean;
  /** @deprecated Use frostEnabled. Kept for backward compatibility. */
  frozenEnabled: boolean;
  /** Whether diamond tiles can appear (unlocks wave 5) */
  diamondEnabled: boolean;
  /** Whether countdown tiles can appear (unlocks wave 9) */
  countdownEnabled: boolean;
  /** Whether shuffle tiles can appear (unlocks wave 10) */
  shuffleEnabled: boolean;
  /** Whether magma tiles can appear (unlocks wave 11) */
  magmaEnabled: boolean;
  /** Whether portal tiles can appear (unlocks wave 11) */
  portalEnabled: boolean;
  /** Whether catalyst tiles can appear (unlocks wave 8) */
  catalystEnabled: boolean;
  /** Whether crystal (growing-multiplier) tiles can appear (unlocks wave 12) */
  crystalEnabled: boolean;
  /** Whether fuse (linked-pair threat) tiles can appear (unlocks wave 9 alongside countdown) */
  fuseEnabled: boolean;
  /** Whether anchor (long-word bonus) tiles can appear (unlocks wave 8 alongside catalyst) */
  anchorEnabled: boolean;
  /** Whether locked tiles can appear (requires matching key tile within distance 3; unlocks wave 11) */
  lockedEnabled?: boolean;
  /** Whether key tiles can appear (pairs with locked; unlocks wave 11) */
  keyEnabled?: boolean;
  /** Whether mystery (surprise outcome) tiles can appear (unlocks wave 5) */
  mysteryEnabled?: boolean;
  /** Number of moves allowed per wave */
  movesAllowed: number;
}

/** Wave parameter lookup table (1-indexed, capped at 12) */
const WAVE_TABLE: WaveConfig[] = [
  // Placeholder index 0 (unused)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.10, iceDistribution: 0.17, goldDistribution: 0.22,
    vowelModifier: 1.0, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    movesAllowed: 12,
  },
  // Wave 1 — basics only: bomb, ice, gold, rainbow (12 moves — learn the ropes)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.10, iceDistribution: 0.17, goldDistribution: 0.22,
    vowelModifier: 1.1, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    movesAllowed: 12,
  },
  // Wave 2 — treasure gem unlocks (10 moves)
  {
    archetype: 'treasureHunt',
    minWordLength: 2, specialTileChance: 0.13, iceDistribution: 0.20, goldDistribution: 0.20,
    vowelModifier: 0.95, maxCascadeChain: 2, cascadeChainBonus: 0.6, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    movesAllowed: 10,
  },
  // Wave 3 — prism unlock (9 moves, score threshold kicks in)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.19, iceDistribution: 0.23, goldDistribution: 0.18,
    vowelModifier: 0.90, maxCascadeChain: 2, cascadeChainBonus: 0.7, scoreThreshold: 80,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    movesAllowed: 9,
  },
  // Wave 4 — lightning unlock (8 moves)
  {
    archetype: 'scoreRush',
    minWordLength: 2, specialTileChance: 0.21, iceDistribution: 0.25, goldDistribution: 0.16,
    vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.8, scoreThreshold: 180,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    movesAllowed: 8,
  },
  // Wave 5 — mystery + diamond unlock (7 moves)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.23, iceDistribution: 0.27, goldDistribution: 0.14,
    vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.9, scoreThreshold: 250,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    mysteryEnabled: true,
    movesAllowed: 7,
  },
  // Wave 6 — frost unlock (7 moves)
  {
    archetype: 'survival',
    minWordLength: 2, specialTileChance: 0.24, iceDistribution: 0.28, goldDistribution: 0.13,
    vowelModifier: 0.82, maxCascadeChain: 3, cascadeChainBonus: 0.95, scoreThreshold: 350,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    mysteryEnabled: true,
    movesAllowed: 7,
  },
  // Wave 7 — vortex unlock (6 moves — tight, requires strategy)
  {
    archetype: 'treasureHunt',
    minWordLength: 2, specialTileChance: 0.25, iceDistribution: 0.30, goldDistribution: 0.12,
    vowelModifier: 0.82, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 450,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: false,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: false,
    mysteryEnabled: true,
    movesAllowed: 6,
  },
  // Wave 8 — revival staircase 1/4: diamond + anchor + gem + magma unlock
  {
    archetype: 'scoreRush',
    minWordLength: 2, specialTileChance: 0.26, iceDistribution: 0.30, goldDistribution: 0.11,
    vowelModifier: 0.80, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 500,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: true,
    countdownEnabled: false, shuffleEnabled: false, magmaEnabled: true, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: true,
    mysteryEnabled: true,
    movesAllowed: 6,
  },
  // Wave 9 — revival staircase 2/4: + vortex + catalyst + portal + shuffle
  {
    archetype: 'survival',
    minWordLength: 2, specialTileChance: 0.27, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.78, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 550,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: true,
    countdownEnabled: false, shuffleEnabled: true, magmaEnabled: true, portalEnabled: true, catalystEnabled: true, crystalEnabled: false, fuseEnabled: false,
    anchorEnabled: true,
    mysteryEnabled: true,
    movesAllowed: 5,
  },
  // Wave 10 — revival staircase 3/4: + countdown + fuse + crystal
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.28, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.76, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 600,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: true,
    countdownEnabled: true, shuffleEnabled: true, magmaEnabled: true, portalEnabled: true, catalystEnabled: true, crystalEnabled: true, fuseEnabled: true,
    anchorEnabled: true,
    mysteryEnabled: true,
    movesAllowed: 5,
  },
  // Wave 11 — revival staircase 4/4
  {
    archetype: 'scoreRush',
    minWordLength: 2, specialTileChance: 0.28, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 650,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: true,
    countdownEnabled: true, shuffleEnabled: true, magmaEnabled: true, portalEnabled: true, catalystEnabled: true, crystalEnabled: true, fuseEnabled: true,
    anchorEnabled: true, lockedEnabled: true, keyEnabled: true,
    mysteryEnabled: true,
    movesAllowed: 6,
  },
  // Wave 12+ — master tier (full revival inheritance)
  {
    archetype: 'survival',
    minWordLength: 2, specialTileChance: 0.30, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 700,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    diamondEnabled: true,
    countdownEnabled: true, shuffleEnabled: true, magmaEnabled: true, portalEnabled: true, catalystEnabled: true, crystalEnabled: true, fuseEnabled: true,
    anchorEnabled: true, lockedEnabled: true, keyEnabled: true,
    mysteryEnabled: true,
    movesAllowed: 6,
  },
];

/**
 * Get wave configuration for a given wave number.
 * Waves 1-6 use the lookup table. Wave 7+ uses wave 6 config
 * with linearly increasing score threshold.
 */
export function getWaveConfig(wave: number): WaveConfig {
  const clamped = Math.min(Math.max(wave, 1), 12);
  const config = { ...WAVE_TABLE[clamped] };

  // Beyond wave 12: increase scoreThreshold linearly AND grow movesAllowed
  // to stay within the feasibility ceiling (~120 pts/move stacked).
  if (wave > 12) {
    config.scoreThreshold = 700 + (wave - 12) * 50;
    config.movesAllowed = Math.max(6, Math.ceil(config.scoreThreshold / 120));
  }

  // Inject the featured roster so every wave — including >12 — has its own identity.
  return { ...config, featuredSpecials: getFeaturedSpecialsForWave(wave) };
}

// ==================== Wave Objectives ====================

import type { BlastObjective, BlastTileType } from '../types';
import { applyFeaturedRoster, getFeaturedSpecialsForWave } from './blastWaveRoster';
import { getTargetWordPool, pickRandomTargetWord } from './blastTargetWordPool';

/**
 * Objectives per wave — designed with progressive disclosure:
 * Each wave teaches ONE new concept, building on what the player already knows.
 * Wave 1: core mechanic (find words). Wave 2: longer = better.
 * Wave 3: special tiles matter. Wave 4+: compound goals.
 */
/** Primary objective: always clear 90%+ of the board */
const CLEAR_BOARD: BlastObjective = { type: 'clear_percent', target: 90 };

/**
 * Max objectives shown per wave (incl. the clear_percent primary). The banner
 * filters out clear_percent, so this caps VISIBLE goal rows at MAX-1 (=3) — the
 * comfortable ceiling on a phone before the list scrolls off and players lose
 * track. Base objectives always come first and bonuses are appended, so capping
 * from the front preserves every base goal and trims only bonus goals.
 */
export const MAX_WAVE_OBJECTIVES = 4;

/**
 * Clamp a wave's objective list to `max` by trimming from the END. Base
 * objectives are built first and bonus objectives (target_word / color_power /
 * cc-mechanic) are appended, so slicing the front keeps the required goals and
 * drops surplus bonuses.
 */
export function capWaveObjectives(
  objectives: BlastObjective[],
  max: number = MAX_WAVE_OBJECTIVES,
): BlastObjective[] {
  return objectives.length <= max ? objectives : objectives.slice(0, max);
}

const WAVE_OBJECTIVES: Record<number, BlastObjective[]> = {
  1: [CLEAR_BOARD, { type: 'word_length', target: 4, minWordLength: 3 }],
  2: [CLEAR_BOARD, { type: 'word_length', target: 3, minWordLength: 4 }, { type: 'score_target', target: 60 }],
  3: [CLEAR_BOARD, { type: 'collect_type', tileType: 'bomb', target: 3 }, { type: 'score_target', target: 100 }],
  4: [CLEAR_BOARD, { type: 'collect_type', tileType: 'lightning', target: 3 }, { type: 'word_length', target: 2, minWordLength: 5 }],
  5: [CLEAR_BOARD, { type: 'collect_type', tileType: 'diamond', target: 2 }, { type: 'score_target', target: 150 }],
  6: [CLEAR_BOARD, { type: 'clear_all_type', tileType: 'frozen', target: 0 }, { type: 'score_target', target: 200 }],
  7: [CLEAR_BOARD, { type: 'collect_type', tileType: 'prism', target: 3 }, { type: 'word_length', target: 3, minWordLength: 5 }],
};

/**
 * Get objectives for a given wave number.
 * Waves 1-6 use the lookup table. Wave 7+ uses wave 6 pattern
 * with linearly increasing score target.
 *
 * @param wave wave number
 * @param language optional game language (for target_word pool lookup)
 * @returns base objectives for the wave
 */
export interface CcMechanicFlags {
  jelly: boolean;
  cake: boolean;
  chocolate: boolean;
}

export function getWaveObjectives(
  wave: number,
  language?: string,
  ccFlags?: CcMechanicFlags,
): BlastObjective[] {
  const clamped = Math.max(wave, 1);

  let baseObjectives: BlastObjective[];
  if (clamped <= 7) {
    baseObjectives = WAVE_OBJECTIVES[clamped].map(obj => ({ ...obj }));
  } else {
    // Wave 8+: rotating objective templates for variety
    const baseScore = 150 + (clamped - 7) * 40;
    const templateIndex = (clamped - 8) % 5;

    const WAVE8_TEMPLATES: BlastObjective[][] = [
      // Template 0: score + collect bombs
      [{ type: 'score_target', target: baseScore }, { type: 'collect_type', tileType: 'bomb', target: 4 }],
      // Template 1: score + long words
      [{ type: 'score_target', target: baseScore }, { type: 'word_length', target: 3, minWordLength: 5 }],
      // Template 2: score + collect prisms
      [{ type: 'score_target', target: baseScore }, { type: 'collect_type', tileType: 'prism', target: 3 }],
      // Template 3: score + clear ice
      [{ type: 'score_target', target: baseScore }, { type: 'clear_all_type', tileType: 'ice', target: 0 }],
      // Template 4: score + collect gems
      [{ type: 'score_target', target: baseScore }, { type: 'collect_type', tileType: 'gem', target: 4 }],
    ];

    baseObjectives = [CLEAR_BOARD, ...WAVE8_TEMPLATES[templateIndex].map(obj => ({ ...obj }))];
  }

  // Seed optional target_word and color_power objectives
  const lang = language ?? 'en';
  let withTargetWord = seedTargetWordObjective(clamped, lang, baseObjectives);
  let withAllSeeds = seedColorPowerObjective(clamped, withTargetWord);
  if (ccFlags) withAllSeeds = seedCcMechanicObjective(clamped, withAllSeeds, ccFlags);

  // Cap total goals so waves never overwhelm the player (base goals kept,
  // surplus bonus goals trimmed). See MAX_WAVE_OBJECTIVES.
  return capWaveObjectives(withAllSeeds);
}

/**
 * Optionally seed a single cc-mechanic objective (jelly / cake / chocolate)
 * into wave objectives, behind PostHog flags. Wave 1-2 protected (FTUE).
 *
 * Mechanic rotates by wave so a treatment cohort sees variety:
 *   wave % 3 == 0 → jelly, == 1 → cake, == 2 → chocolate.
 * Skipped if the rotation lands on a flag the cohort hasn't unlocked.
 */
export function seedCcMechanicObjective(
  wave: number,
  objectives: BlastObjective[],
  flags: CcMechanicFlags,
): BlastObjective[] {
  if (wave < 3) return objectives;

  const order = [
    flags.jelly ? 'clear_jelly' as const : null,
    flags.cake ? 'kill_cake' as const : null,
    flags.chocolate ? 'stop_chocolate' as const : null,
  ];
  const enabled = order.filter((x): x is 'clear_jelly' | 'kill_cake' | 'stop_chocolate' => x !== null);
  if (enabled.length === 0) return objectives;

  const pick = enabled[wave % enabled.length];
  if (pick === 'clear_jelly') {
    return [...objectives, { type: 'clear_jelly', target: 4 + Math.min(wave, 6) }];
  }
  if (pick === 'kill_cake') {
    return [...objectives, { type: 'kill_cake', target: 5 }];
  }
  return [...objectives, { type: 'stop_chocolate', target: 0 }];
}

/**
 * Optionally seed a target_word objective into wave objectives.
 * Adds target_word goal for waves 3+ at 25% probability per wave.
 * Defers to server/RNG for actual board validation.
 *
 * @param wave wave number
 * @param language game language (en/he/sv/ja/es)
 * @param objectives current wave objectives to augment
 * @returns objectives with optional target_word added
 */
export function seedTargetWordObjective(
  wave: number,
  language: string,
  objectives: BlastObjective[],
): BlastObjective[] {
  // Only add to wave 3+ at 25% rate
  if (wave < 3) return objectives;

  // Deterministic RNG: use wave as seed for pseudo-random chance
  const shouldAdd = ((wave * 37) % 100) < 25;
  if (!shouldAdd) return objectives;

  const pool = getTargetWordPool(language as import('@/shared/types/game').Language);
  if (pool.length === 0) return objectives; // No words available for language

  const targetWord = pickRandomTargetWord(pool);
  if (!targetWord) return objectives;

  // Add target_word objective (bonus, not required for advance)
  return [
    ...objectives,
    { type: 'target_word' as const, target: 1, targetWord },
  ];
}

/**
 * Optionally seed a color_power objective into wave objectives.
 * Adds color_power goal for waves 4+ at 25% probability per wave.
 * Rotates color: wave 4=pink, 5=cyan, 8=lime, then repeats.
 *
 * @param wave wave number
 * @param objectives current wave objectives to augment
 * @returns objectives with optional color_power added
 */
export function seedColorPowerObjective(
  wave: number,
  objectives: BlastObjective[],
): BlastObjective[] {
  // Only add to wave 4+ at 25% rate
  if (wave < 4) return objectives;

  // Deterministic RNG: use wave as seed for pseudo-random chance
  const shouldAdd = ((wave * 47) % 100) < 25;
  if (!shouldAdd) return objectives;

  // Rotate color: pink (4) → cyan (5) → lime (8) → pink (11) ...
  const colorRotation: Array<'pink' | 'cyan' | 'lime'> = ['pink', 'cyan', 'lime'];
  const colorIndex = (wave - 4) % 3;
  const color = colorRotation[colorIndex];

  // Ramp minColorCount: early waves 3, later waves 4+
  const minColorCount = wave >= 8 ? 4 : 3;

  // Add color_power objective (bonus, not required for advance)
  return [
    ...objectives,
    {
      type: 'color_power' as const,
      target: 1,
      colorTag: color,
      minColorCount,
    },
  ];
}

/** Lightning share when enabled (taken from gold + rainbow) */
export const LIGHTNING_SHARE = 0.08;
/** Vortex share when enabled (renamed from MAGNET_SHARE; taken from gold + rainbow) */
export const VORTEX_SHARE = 0.06;
/** Treasure gem share when enabled */
export const TREASURE_GEM_SHARE = 0.06;
/** Prism share when enabled */
export const PRISM_SHARE = 0.06;
/** Frost share when enabled (renamed from FROZEN_SHARE) */
export const FROST_SHARE = 0.05;
/** Diamond share when enabled (revival 2× boost — was 0.04). */
export const DIAMOND_SHARE = 0.08;
/** Countdown share when enabled (revival 2× boost — was 0.04). */
export const COUNTDOWN_SHARE = 0.08;
/** Shuffle share when enabled (revival 2× boost — was 0.04). */
export const SHUFFLE_SHARE = 0.08;
/** Magma share when enabled (revival 2× boost — was 0.04). */
export const MAGMA_SHARE = 0.08;
/** Portal share when enabled (revival 2× boost — was 0.04; spawns in pairs). */
export const PORTAL_SHARE = 0.08;
/** Catalyst share when enabled (revival 2× boost — was 0.04). */
export const CATALYST_SHARE = 0.08;
/** Crystal share when enabled (revival 2× boost — was 0.03; growth multiplier scales exponentially). */
export const CRYSTAL_SHARE = 0.06;
/** Fuse share when enabled (revival 2× boost — was 0.04; spawns in linked pairs). */
export const FUSE_SHARE = 0.08;
/** Anchor share when enabled (revival 2× boost — was 0.04; long-word reward). */
export const ANCHOR_SHARE = 0.08;
/** Locked tile share when enabled (paired with key; unlocks wave 11). */
export const LOCKED_SHARE = 0.06;
/** Key tile share when enabled (unlocks paired locked tiles; unlocks wave 11). */
export const KEY_SHARE = 0.06;
/** Mystery tile share when enabled (surprise outcome; unlocks wave 5). */
export const MYSTERY_SHARE = 0.04;

/**
 * CURATED PERMANENT ROSTER (clarity pass, 2026-06).
 *
 * The wave 8-12 "revival staircase" (see getWaveDistribution docstring) used to
 * re-enable ~20 special types at once, so a player past wave 8 faced a board
 * flooded with effects that blur together — the "too many tile types, can't
 * tell what they do" complaint. We permanently retire the redundant + hard-to-
 * read ones so the roster never grows beyond the clear core the player already
 * learned in the FTUE waves (bomb / ice / gold / rainbow / lightning / prism /
 * frozen). Each kept tile owns one legible mechanic family.
 *
 * Retired here (zeroed at EVERY wave for BOTH client refill and server
 * generation, since both roll on getWaveDistribution):
 *   - magnet/vortex  : pull-then-explode is unreadable at a glance
 *   - gem            : multi-hit treasure overlaps the reward read of gold
 *   - diamond        : just a bigger gold multiplier
 *   - countdown/fuse : two near-identical "timer → 3×3 blast" tiles
 *   - shuffle        : rearranging the board disorients more than it delights
 *   - magma/catalyst : diagonal/area clears that blur with bomb + lightning
 *   - portal         : paired-portal scoring is too complex for a fast word game
 *   - crystal        : passive between-turn multiplier with an invisible payoff
 *
 * Reversible: drop a type from this set to bring it back everywhere. This is the
 * single curation lever — do not also edit the per-wave *Enabled flags.
 */
export const BLAST_RETIRED_SPECIAL_TYPES: ReadonlySet<BlastTileType> = new Set<BlastTileType>([
  'magnet',
  'gem',
  'diamond',
  'countdown',
  'shuffle',
  'magma',
  'portal',
  'catalyst',
  'crystal',
  'fuse',
  // "Locked tiles" removal (2026-06-13): frozen renders an un-thawed frost
  // "locked" overlay (derived via cellFilter) that confused players, so it stays
  // retired. ICE is kept — it now spawns and is directly selectable/meltable (no
  // lock; see THAWABLE_TYPES in blastThaw.ts). Reversible: drop frozen to bring back.
  'frozen',
  // locked/key retirement (2026-07-04): the `locked` tile renders a padlock icon
  // (reads as untouchable) but computeCellFilter never gated it → it was actually
  // freely selectable, and the key→unlock mechanic was NEVER implemented
  // (clearTilesProcessor has zero key handling). Net effect: a tile that LOOKS
  // locked but isn't, confusing players into thinking they're dead-ended. Same
  // failure mode the frozen retirement fixed. Reversible: to ship locked as a
  // REAL mechanic, add 'locked' to THAWABLE_TYPES (reuses the thaw pipeline) and
  // drop this pair from the retired set.
  'locked',
  'key',
]);

/**
 * Build tile distribution for a wave, gating special tiles by unlock progression.
 *
 * Candy Crush staircase unlock order:
 * Wave 1-7: bomb/ice/gold/rainbow → +gem → +prism → +lightning → +diamond → +frost → +vortex
 * Wave 8: + catalyst, anchor     Wave 9: + countdown, fuse
 * Wave 10: + shuffle   Wave 11: + magma, portal
 * Wave 12+: + crystal (everything)
 *
 * New tile shares are carved from gold + rainbow proportionally via takeShare().
 * Returns a record suitable for customDistribution in BlastGameConfig.
 */
export function getWaveDistribution(config: WaveConfig): Record<string, number> {
  const {
    goldDistribution, iceDistribution,
    lightningEnabled, vortexEnabled, magnetEnabled,
    gemEnabled, prismEnabled, frostEnabled, frozenEnabled,
    diamondEnabled,
    countdownEnabled, shuffleEnabled, magmaEnabled, portalEnabled, catalystEnabled,
    crystalEnabled, fuseEnabled, anchorEnabled,
    lockedEnabled, keyEnabled, mysteryEnabled,
  } = config;

  // Effective flags (support deprecated field aliases)
  const useVortex = vortexEnabled || magnetEnabled;
  const useFrost = frostEnabled || frozenEnabled;

  // Base wave-1 distribution: bomb fixed, rainbow fills the remainder after ice/gold/bomb.
  const BOMB_BASE = 0.22;

  let gold = goldDistribution;
  // Rainbow fills the gap after all fixed allocations
  let rainbow = 1.0 - goldDistribution - iceDistribution - BOMB_BASE;
  let lightning = 0;
  let vortex = 0;
  let gem = 0;
  let prism = 0;
  let frost = 0;
  let diamond = 0;
  let countdown = 0;
  let shuffle = 0;
  let magma = 0;
  let portal = 0;
  let catalyst = 0;
  let crystal = 0;
  let fuse = 0;
  let anchor = 0;
  let locked = 0;
  let key = 0;
  let mystery = 0;

  // Helper: take a share proportionally from gold + rainbow.
  // Floor of 0.10 combined preserves the workhorse score economy
  // (gold ×3 multiplier + rainbow cascade trigger) — Sprint 1+2 audit's
  // spawn-dilution concern in reverse: don't dilute the *base* specials
  // by feeding too many exotic shares.
  const GOLD_RAINBOW_FLOOR = 0.10;
  const takeShare = (share: number) => {
    const total = gold + rainbow;
    if (total <= GOLD_RAINBOW_FLOOR) return;
    const headroom = total - GOLD_RAINBOW_FLOOR;
    const taken = Math.min(share, headroom);
    if (taken <= 0) return;
    const ratio = gold / total;
    gold -= taken * ratio;
    rainbow -= taken * (1 - ratio);
  };

  if (lightningEnabled) {
    lightning = LIGHTNING_SHARE;
    takeShare(LIGHTNING_SHARE);
  }

  if (useVortex) {
    vortex = VORTEX_SHARE;
    takeShare(VORTEX_SHARE);
  }

  if (gemEnabled) {
    gem = TREASURE_GEM_SHARE;
    takeShare(TREASURE_GEM_SHARE);
  }

  if (prismEnabled) {
    prism = PRISM_SHARE;
    takeShare(PRISM_SHARE);
  }

  if (useFrost) {
    frost = FROST_SHARE;
    takeShare(FROST_SHARE);
  }

  if (diamondEnabled) {
    diamond = DIAMOND_SHARE;
    takeShare(DIAMOND_SHARE);
  }

  if (countdownEnabled) {
    countdown = COUNTDOWN_SHARE;
    takeShare(COUNTDOWN_SHARE);
  }

  if (shuffleEnabled) {
    shuffle = SHUFFLE_SHARE;
    takeShare(SHUFFLE_SHARE);
  }

  if (magmaEnabled) {
    magma = MAGMA_SHARE;
    takeShare(MAGMA_SHARE);
  }

  if (portalEnabled) {
    portal = PORTAL_SHARE;
    takeShare(PORTAL_SHARE);
  }

  if (catalystEnabled) {
    catalyst = CATALYST_SHARE;
    takeShare(CATALYST_SHARE);
  }

  if (crystalEnabled) {
    crystal = CRYSTAL_SHARE;
    takeShare(CRYSTAL_SHARE);
  }

  if (fuseEnabled) {
    fuse = FUSE_SHARE;
    takeShare(FUSE_SHARE);
  }

  if (anchorEnabled) {
    anchor = ANCHOR_SHARE;
    takeShare(ANCHOR_SHARE);
  }

  if (lockedEnabled) {
    locked = LOCKED_SHARE;
    takeShare(LOCKED_SHARE);
  }

  if (keyEnabled) {
    key = KEY_SHARE;
    takeShare(KEY_SHARE);
  }

  if (mysteryEnabled) {
    mystery = MYSTERY_SHARE;
    takeShare(MYSTERY_SHARE);
  }

  const raw: Record<string, number> = {
    gold: Math.max(0, gold),
    bomb: BOMB_BASE,
    rainbow: Math.max(0, rainbow),
    ice: iceDistribution,
    lightning,
    // Use canonical BlastTileType key 'magnet' (vortex was a legacy alias that
    // doesn't exist in the type union and would produce unhandled tiles)
    magnet: vortex,
    gem,
    prism,
    // Use canonical BlastTileType key 'frozen' (frost was a legacy alias)
    frozen: frost,
    diamond,
    countdown,
    shuffle,
    magma,
    portal,
    catalyst,
    crystal,
    fuse,
    anchor,
    locked,
    key,
    mystery,
  };

  // Curation: zero every retired type before normalization so the freed weight
  // redistributes across the kept roster (board stays full of specials, just
  // fewer distinct kinds). Single lever for both client + server.
  for (const t of BLAST_RETIRED_SPECIAL_TYPES) {
    if (t in raw) raw[t] = 0;
  }

  // Featured roster: uniqueness per wave with FEWER concurrent tile kinds.
  const filtered = applyFeaturedRoster(raw, config.featuredSpecials);
  for (const k of Object.keys(raw)) raw[k] = filtered[k] ?? 0;

  // Normalize to sum to 1.0 (avoids drift when many tiles are enabled)
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - 1.0) > 0.001) {
    for (const key of Object.keys(raw)) {
      raw[key] /= sum;
    }
  }

  return raw;
}
