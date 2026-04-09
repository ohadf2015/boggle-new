/**
 * blastWaveConfig — Pure scaling functions for multi-round wave system.
 * No React dependencies — trivially testable.
 *
 * Inspired by Candy Crush "complexity staircase":
 * parameters ramp difficulty gradually, with new mechanics unlocking at milestones.
 *
 * Tile unlock progression:
 * Wave 1: bomb, ice, gold, silver, rainbow (basics)
 * Wave 2: + treasure gem
 * Wave 3: + prism
 * Wave 4: + lightning
 * Wave 5: + diamond, mirror
 * Wave 6: + frost
 * Wave 7: + vortex
 * Wave 8: + wildcard
 * Wave 9: + countdown
 * Wave 10: + shuffle
 * Wave 11: + magma, portal
 * Wave 12+: + catalyst (everything)
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
  /** Whether mirror tiles can appear (unlocks wave 3) */
  mirrorEnabled: boolean;
  /** Whether silver tiles can appear (available from wave 1) */
  silverEnabled: boolean;
  /** Whether diamond tiles can appear (unlocks wave 4) */
  diamondEnabled: boolean;
  /** Whether wildcard tiles can appear (unlocks wave 8) */
  wildcardEnabled: boolean;
  /** Whether countdown tiles can appear (unlocks wave 9) */
  countdownEnabled: boolean;
  /** Whether shuffle tiles can appear (unlocks wave 10) */
  shuffleEnabled: boolean;
  /** Whether magma tiles can appear (unlocks wave 11) */
  magmaEnabled: boolean;
  /** Whether portal tiles can appear (unlocks wave 11) */
  portalEnabled: boolean;
  /** Whether catalyst tiles can appear (unlocks wave 12) */
  catalystEnabled: boolean;
  /** Whether crystal (growing-multiplier) tiles can appear (unlocks wave 12) */
  crystalEnabled: boolean;
  /** Whether fuse (linked-pair threat) tiles can appear (unlocks wave 9 alongside countdown) */
  fuseEnabled: boolean;
  /** Number of moves allowed per wave */
  movesAllowed: number;
}

/** Wave parameter lookup table (1-indexed, capped at 6) */
const WAVE_TABLE: WaveConfig[] = [
  // Placeholder index 0 (unused)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.10, iceDistribution: 0.17, goldDistribution: 0.22,
    vowelModifier: 1.0, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 12,
  },
  // Wave 1 — basics only: bomb, ice, gold, silver, rainbow (12 moves — learn the ropes)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.10, iceDistribution: 0.17, goldDistribution: 0.22,
    vowelModifier: 1.1, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 12,
  },
  // Wave 2 — treasure gem unlocks (10 moves)
  {
    archetype: 'treasureHunt',
    minWordLength: 2, specialTileChance: 0.13, iceDistribution: 0.20, goldDistribution: 0.20,
    vowelModifier: 0.95, maxCascadeChain: 2, cascadeChainBonus: 0.6, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 10,
  },
  // Wave 3 — prism unlock (9 moves, score threshold kicks in)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.19, iceDistribution: 0.23, goldDistribution: 0.18,
    vowelModifier: 0.90, maxCascadeChain: 2, cascadeChainBonus: 0.7, scoreThreshold: 80,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 9,
  },
  // Wave 4 — lightning unlock (8 moves)
  {
    archetype: 'scoreRush',
    minWordLength: 2, specialTileChance: 0.21, iceDistribution: 0.25, goldDistribution: 0.16,
    vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.8, scoreThreshold: 180,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 8,
  },
  // Wave 5 — diamond + mirror unlock (7 moves)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.23, iceDistribution: 0.27, goldDistribution: 0.14,
    vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.9, scoreThreshold: 250,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 7,
  },
  // Wave 6 — frost unlock (7 moves)
  {
    archetype: 'survival',
    minWordLength: 2, specialTileChance: 0.24, iceDistribution: 0.28, goldDistribution: 0.13,
    vowelModifier: 0.82, maxCascadeChain: 3, cascadeChainBonus: 0.95, scoreThreshold: 350,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 7,
  },
  // Wave 7 — vortex unlock (6 moves — tight, requires strategy)
  {
    archetype: 'treasureHunt',
    minWordLength: 2, specialTileChance: 0.25, iceDistribution: 0.30, goldDistribution: 0.12,
    vowelModifier: 0.82, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 450,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: false, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 6,
  },
  // Wave 8 — wildcard unlock (6 moves)
  {
    archetype: 'scoreRush',
    minWordLength: 2, specialTileChance: 0.26, iceDistribution: 0.30, goldDistribution: 0.11,
    vowelModifier: 0.80, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 500,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: true, countdownEnabled: false, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: false,
    movesAllowed: 6,
  },
  // Wave 9 — countdown unlock (5 moves — tension mechanic, defuse or suffer)
  {
    archetype: 'survival',
    minWordLength: 2, specialTileChance: 0.27, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.78, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 550,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: true, countdownEnabled: true, shuffleEnabled: false, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: true,
    movesAllowed: 5,
  },
  // Wave 10 — shuffle unlock (5 moves — rearranges board on clear)
  {
    archetype: 'normal',
    minWordLength: 2, specialTileChance: 0.28, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.76, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 600,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: true, countdownEnabled: true, shuffleEnabled: true, magmaEnabled: false, portalEnabled: false, catalystEnabled: false, crystalEnabled: false, fuseEnabled: true,
    movesAllowed: 5,
  },
  // Wave 11 — magma + portal unlock (5 moves — diagonal eruption + teleport paths)
  {
    archetype: 'scoreRush',
    minWordLength: 2, specialTileChance: 0.28, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 650,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: true, countdownEnabled: true, shuffleEnabled: true, magmaEnabled: true, portalEnabled: true, catalystEnabled: false, crystalEnabled: false, fuseEnabled: true,
    movesAllowed: 6,
  },
  // Wave 12+ — catalyst unlock, everything available (master tier)
  {
    archetype: 'survival',
    minWordLength: 2, specialTileChance: 0.30, iceDistribution: 0.30, goldDistribution: 0.10,
    vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 700,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true,
    wildcardEnabled: true, countdownEnabled: true, shuffleEnabled: true, magmaEnabled: true, portalEnabled: true, catalystEnabled: true, crystalEnabled: true, fuseEnabled: true,
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

  return config;
}

// ==================== Wave Objectives ====================

import type { BlastObjective } from '../types';

/**
 * Objectives per wave — designed with progressive disclosure:
 * Each wave teaches ONE new concept, building on what the player already knows.
 * Wave 1: core mechanic (find words). Wave 2: longer = better.
 * Wave 3: special tiles matter. Wave 4+: compound goals.
 */
/** Primary objective: always clear 90%+ of the board */
const CLEAR_BOARD: BlastObjective = { type: 'clear_percent', target: 90 };

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
 */
export function getWaveObjectives(wave: number): BlastObjective[] {
  const clamped = Math.max(wave, 1);

  if (clamped <= 7) {
    return WAVE_OBJECTIVES[clamped].map(obj => ({ ...obj }));
  }

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

  return [CLEAR_BOARD, ...WAVE8_TEMPLATES[templateIndex].map(obj => ({ ...obj }))];
}

/** Lightning share when enabled (taken from gold + rainbow) */
const LIGHTNING_SHARE = 0.08;
/** Vortex share when enabled (renamed from MAGNET_SHARE; taken from gold + rainbow) */
const VORTEX_SHARE = 0.06;
/** Treasure gem share when enabled */
const TREASURE_GEM_SHARE = 0.06;
/** Prism share when enabled */
const PRISM_SHARE = 0.06;
/** Frost share when enabled (renamed from FROZEN_SHARE) */
const FROST_SHARE = 0.05;
/** Mirror share when enabled (taken from gold + rainbow) */
const MIRROR_SHARE = 0.06;
/** Diamond share when enabled (taken from gold + rainbow) */
const DIAMOND_SHARE = 0.04;
/** Wildcard share when enabled */
const WILDCARD_SHARE = 0.04;
/** Countdown share when enabled */
const COUNTDOWN_SHARE = 0.04;
/** Shuffle share when enabled */
const SHUFFLE_SHARE = 0.04;
/** Magma share when enabled */
const MAGMA_SHARE = 0.04;
/** Portal share when enabled (spawns in pairs) */
const PORTAL_SHARE = 0.04;
/** Catalyst share when enabled */
const CATALYST_SHARE = 0.04;
/** Crystal share when enabled — smaller than others because growth multiplier scales exponentially */
const CRYSTAL_SHARE = 0.03;
/** Fuse share when enabled — spawns in linked pairs */
const FUSE_SHARE = 0.04;

/**
 * Build tile distribution for a wave, gating special tiles by unlock progression.
 *
 * Candy Crush staircase unlock order:
 * Wave 1-7: original tiles (see file header)
 * Wave 8: + wildcard   Wave 9: + countdown
 * Wave 10: + shuffle   Wave 11: + magma, portal
 * Wave 12+: + catalyst (everything)
 *
 * New tile shares are carved from gold + rainbow proportionally via takeShare().
 * Returns a record suitable for customDistribution in BlastGameConfig.
 */
export function getWaveDistribution(config: WaveConfig): Record<string, number> {
  const {
    goldDistribution, iceDistribution,
    lightningEnabled, vortexEnabled, magnetEnabled,
    gemEnabled, prismEnabled, frostEnabled, frozenEnabled,
    mirrorEnabled, diamondEnabled,
    wildcardEnabled, countdownEnabled, shuffleEnabled, magmaEnabled, portalEnabled, catalystEnabled,
    crystalEnabled, fuseEnabled,
  } = config;

  // Effective flags (support deprecated field aliases)
  const useVortex = vortexEnabled || magnetEnabled;
  const useFrost = frostEnabled || frozenEnabled;

  // Base wave-1 distribution: bomb=0.25, silver=0.15, rainbow=remainder, ice/gold from config
  // No wildcard in any wave.
  const BOMB_BASE = 0.22;
  const SILVER_BASE = 0.15;

  let gold = goldDistribution;
  // Rainbow fills the gap after all fixed allocations
  let rainbow = 1.0 - goldDistribution - iceDistribution - BOMB_BASE - SILVER_BASE;
  let lightning = 0;
  let vortex = 0;
  let gem = 0;
  let prism = 0;
  let frost = 0;
  let mirror = 0;
  let diamond = 0;
  let wildcard = 0;
  let countdown = 0;
  let shuffle = 0;
  let magma = 0;
  let portal = 0;
  let catalyst = 0;
  let crystal = 0;
  let fuse = 0;
  const silver = SILVER_BASE;

  // Helper: take a share proportionally from gold + rainbow
  const takeShare = (share: number) => {
    const total = gold + rainbow;
    if (total <= 0) return;
    const ratio = gold / total;
    gold -= share * ratio;
    rainbow -= share * (1 - ratio);
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

  if (mirrorEnabled) {
    mirror = MIRROR_SHARE;
    takeShare(MIRROR_SHARE);
  }

  if (diamondEnabled) {
    diamond = DIAMOND_SHARE;
    takeShare(DIAMOND_SHARE);
  }

  if (wildcardEnabled) {
    wildcard = WILDCARD_SHARE;
    takeShare(WILDCARD_SHARE);
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

  const raw: Record<string, number> = {
    gold: Math.max(0, gold),
    bomb: BOMB_BASE,
    rainbow: Math.max(0, rainbow),
    ice: iceDistribution,
    silver,
    lightning,
    // Use canonical BlastTileType key 'magnet' (vortex was a legacy alias that
    // doesn't exist in the type union and would produce unhandled tiles)
    magnet: vortex,
    gem,
    prism,
    // Use canonical BlastTileType key 'frozen' (frost was a legacy alias)
    frozen: frost,
    mirror,
    diamond,
    wildcard,
    countdown,
    shuffle,
    magma,
    portal,
    catalyst,
    crystal,
    fuse,
  };

  // Normalize to sum to 1.0 (avoids drift when many tiles are enabled)
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - 1.0) > 0.001) {
    for (const key of Object.keys(raw)) {
      raw[key] /= sum;
    }
  }

  return raw;
}
