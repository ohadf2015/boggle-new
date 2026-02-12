/**
 * blastWaveConfig — Pure scaling functions for multi-round wave system.
 * No React dependencies — trivially testable.
 *
 * Inspired by Candy Crush "complexity staircase":
 * parameters ramp difficulty gradually, with new mechanics unlocking at milestones.
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
  /** Whether magnet tiles can appear */
  magnetEnabled: boolean;
}

/** Wave parameter lookup table (1-indexed, capped at 6) */
const WAVE_TABLE: WaveConfig[] = [
  // Placeholder index 0 (unused)
  { minWordLength: 2, specialTileChance: 0.15, iceDistribution: 0.17, goldDistribution: 0.22, vowelModifier: 1.0, maxCascadeChain: 3, cascadeChainBonus: 0.5, scoreThreshold: undefined, lightningEnabled: false, magnetEnabled: false },
  // Wave 1
  { minWordLength: 2, specialTileChance: 0.15, iceDistribution: 0.17, goldDistribution: 0.22, vowelModifier: 1.0, maxCascadeChain: 3, cascadeChainBonus: 0.5, scoreThreshold: undefined, lightningEnabled: false, magnetEnabled: false },
  // Wave 2
  { minWordLength: 2, specialTileChance: 0.17, iceDistribution: 0.20, goldDistribution: 0.20, vowelModifier: 0.95, maxCascadeChain: 3, cascadeChainBonus: 0.6, scoreThreshold: undefined, lightningEnabled: false, magnetEnabled: false },
  // Wave 3
  { minWordLength: 3, specialTileChance: 0.19, iceDistribution: 0.23, goldDistribution: 0.18, vowelModifier: 0.90, maxCascadeChain: 3, cascadeChainBonus: 0.7, scoreThreshold: 30, lightningEnabled: false, magnetEnabled: false },
  // Wave 4
  { minWordLength: 3, specialTileChance: 0.21, iceDistribution: 0.25, goldDistribution: 0.16, vowelModifier: 0.85, maxCascadeChain: 4, cascadeChainBonus: 0.8, scoreThreshold: 50, lightningEnabled: true, magnetEnabled: false },
  // Wave 5
  { minWordLength: 4, specialTileChance: 0.23, iceDistribution: 0.28, goldDistribution: 0.14, vowelModifier: 0.80, maxCascadeChain: 4, cascadeChainBonus: 0.9, scoreThreshold: 80, lightningEnabled: true, magnetEnabled: false },
  // Wave 6+
  { minWordLength: 4, specialTileChance: 0.25, iceDistribution: 0.30, goldDistribution: 0.12, vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 120, lightningEnabled: true, magnetEnabled: true },
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

/** Lightning share when enabled (taken from gold + rainbow) */
const LIGHTNING_SHARE = 0.10;
/** Magnet share when enabled (taken from gold + rainbow) */
const MAGNET_SHARE = 0.08;

/**
 * Build tile distribution for a wave, gating lightning/magnet.
 * Lightning/magnet take their share from gold/rainbow proportionally.
 * Returns a record suitable for customDistribution in BlastGameConfig.
 */
export function getWaveDistribution(config: WaveConfig): Record<string, number> {
  const { goldDistribution, iceDistribution, lightningEnabled, magnetEnabled } = config;

  // Base: bomb 0.22, rainbow remainder, ice/gold from config, wildcard 0.17
  let gold = goldDistribution;
  let rainbow = 1.0 - goldDistribution - iceDistribution - 0.22 - 0.17; // bomb + wildcard fixed
  let lightning = 0;
  let magnet = 0;

  if (lightningEnabled) {
    lightning = LIGHTNING_SHARE;
    // Take from gold and rainbow proportionally
    const ratio = gold / (gold + rainbow);
    gold -= LIGHTNING_SHARE * ratio;
    rainbow -= LIGHTNING_SHARE * (1 - ratio);
  }

  if (magnetEnabled) {
    magnet = MAGNET_SHARE;
    const ratio = gold / (gold + rainbow);
    gold -= MAGNET_SHARE * ratio;
    rainbow -= MAGNET_SHARE * (1 - ratio);
  }

  return {
    gold: Math.max(0, gold),
    bomb: 0.22,
    rainbow: Math.max(0, rainbow),
    ice: iceDistribution,
    wildcard: 0.17,
    lightning,
    magnet,
  };
}
