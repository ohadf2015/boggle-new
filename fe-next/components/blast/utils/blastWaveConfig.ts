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
 * Wave 3: + prism, mirror
 * Wave 4: + frost, lightning, diamond
 * Wave 5: + (all except vortex)
 * Wave 6+: + vortex (everything)
 */

export interface WaveConfig {
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
  /** Number of moves allowed per wave */
  movesAllowed: number;
}

/** Wave parameter lookup table (1-indexed, capped at 6) */
const WAVE_TABLE: WaveConfig[] = [
  // Placeholder index 0 (unused)
  {
    minWordLength: 2, specialTileChance: 0.10, iceDistribution: 0.17, goldDistribution: 0.22,
    vowelModifier: 1.0, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false, movesAllowed: 20,
  },
  // Wave 1 — basics only: bomb, ice, gold, silver, rainbow (20 moves — generous intro)
  // Lower special tile chance (0.10) so new players aren't overwhelmed by special tiles
  {
    minWordLength: 2, specialTileChance: 0.10, iceDistribution: 0.17, goldDistribution: 0.22,
    vowelModifier: 1.0, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: false, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false, movesAllowed: 20,
  },
  // Wave 2 — treasure gem unlocks (18 moves)
  // Slightly lower special tile chance (0.13) to ramp gradually
  {
    minWordLength: 2, specialTileChance: 0.13, iceDistribution: 0.20, goldDistribution: 0.20,
    vowelModifier: 0.95, maxCascadeChain: 2, cascadeChainBonus: 0.6, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: false, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: false, silverEnabled: true, diamondEnabled: false, movesAllowed: 18,
  },
  // Wave 3 — prism + mirror unlock (17 moves, no score threshold — learn new mechanics freely)
  {
    minWordLength: 3, specialTileChance: 0.19, iceDistribution: 0.23, goldDistribution: 0.18,
    vowelModifier: 0.90, maxCascadeChain: 2, cascadeChainBonus: 0.7, scoreThreshold: undefined,
    lightningEnabled: false, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: false, frozenEnabled: false,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: false, movesAllowed: 17,
  },
  // Wave 4 — frost + lightning + diamond unlock (15 moves)
  {
    minWordLength: 3, specialTileChance: 0.21, iceDistribution: 0.25, goldDistribution: 0.16,
    vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.8, scoreThreshold: 50,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true, movesAllowed: 15,
  },
  // Wave 5 — all minus vortex (14 moves)
  {
    minWordLength: 4, specialTileChance: 0.23, iceDistribution: 0.28, goldDistribution: 0.14,
    vowelModifier: 0.82, maxCascadeChain: 3, cascadeChainBonus: 0.9, scoreThreshold: 80,
    lightningEnabled: true, vortexEnabled: false, magnetEnabled: false,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true, movesAllowed: 14,
  },
  // Wave 6+ — everything unlocked (12 moves — tight, requires strategy)
  {
    minWordLength: 4, specialTileChance: 0.25, iceDistribution: 0.30, goldDistribution: 0.12,
    vowelModifier: 0.82, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 120,
    lightningEnabled: true, vortexEnabled: true, magnetEnabled: true,
    gemEnabled: true, prismEnabled: true, frostEnabled: true, frozenEnabled: true,
    mirrorEnabled: true, silverEnabled: true, diamondEnabled: true, movesAllowed: 12,
  },
];

/**
 * Get wave configuration for a given wave number.
 * Waves 1-6 use the lookup table. Wave 7+ uses wave 6 config
 * with linearly increasing score threshold.
 */
export function getWaveConfig(wave: number): WaveConfig {
  const clamped = Math.min(Math.max(wave, 1), 6);
  const config = { ...WAVE_TABLE[clamped] };

  // Beyond wave 6: increase scoreThreshold linearly
  if (wave > 6) {
    config.scoreThreshold = 120 + (wave - 6) * 40;
  }

  return config;
}

// ==================== Wave Objectives ====================

import type { BlastObjective } from '../types';

/** Objectives per wave (1-indexed). Wave 6+ uses a scaling formula. */
const WAVE_OBJECTIVES: Record<number, BlastObjective[]> = {
  1: [{ type: 'score_target', target: 20 }],
  2: [{ type: 'collect_type', tileType: 'gem', target: 3 }],
  3: [{ type: 'clear_all_type', tileType: 'ice', target: 0 }, { type: 'score_target', target: 40 }],
  4: [{ type: 'collect_type', tileType: 'bomb', target: 4 }, { type: 'word_length', target: 2, minWordLength: 5 }],
  5: [{ type: 'clear_all_type', tileType: 'frozen', target: 0 }, { type: 'collect_type', tileType: 'lightning', target: 3 }],
  6: [{ type: 'score_target', target: 120 }, { type: 'collect_type', tileType: 'prism', target: 2 }],
};

/**
 * Get objectives for a given wave number.
 * Waves 1-6 use the lookup table. Wave 7+ uses wave 6 pattern
 * with linearly increasing score target.
 */
export function getWaveObjectives(wave: number): BlastObjective[] {
  const clamped = Math.max(wave, 1);

  if (clamped <= 6) {
    return WAVE_OBJECTIVES[clamped].map(obj => ({ ...obj }));
  }

  // Wave 7+: score_target scales + collect prism
  return [
    { type: 'score_target', target: 120 + (clamped - 6) * 40 },
    { type: 'collect_type', tileType: 'prism', target: 2 },
  ];
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

/**
 * Build tile distribution for a wave, gating special tiles by unlock progression.
 *
 * Candy Crush staircase unlock order:
 * Wave 1: bomb, ice, gold, silver, rainbow (no wildcard)
 * Wave 2: + gem (treasure)
 * Wave 3: + prism, mirror
 * Wave 4: + frost, lightning, diamond
 * Wave 5: (same — all except vortex)
 * Wave 6+: + vortex
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
