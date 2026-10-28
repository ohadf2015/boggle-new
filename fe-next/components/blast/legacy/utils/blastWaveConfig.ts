/**
 * blastWaveConfig — Pure scaling functions for multi-round wave system.
 * No React dependencies — trivially testable.
 *
 * Every wave rolls the same two random specials — bombs and coins ('gold').
 * Later waves roll more of them; diamonds are only ever earned by rare words.
 */

/**
 * Wave archetype — pure metadata tag used by the UI layer to pick mascot art,
 * wave-intro copy, and results flavor. The engine does NOT read this field.
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
  /** Coin share of random specials; bombs take the rest */
  goldDistribution: number;
  /** Vowel frequency modifier (1.0 = normal, lower = fewer vowels) */
  vowelModifier: number;
  /** Max cascade chain depth */
  maxCascadeChain: number;
  /** Cascade chain bonus multiplier */
  cascadeChainBonus: number;
  /** Score threshold to advance to next wave (undefined = no threshold) */
  scoreThreshold: number | undefined;
  /** Number of moves allowed per wave */
  movesAllowed: number;
}

/** Wave parameter lookup table (1-indexed, capped at 12) */
const WAVE_TABLE: WaveConfig[] = [
  // Placeholder index 0 (unused)
  { archetype: 'normal', minWordLength: 2, specialTileChance: 0.06, goldDistribution: 0.5, vowelModifier: 1.0, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined, movesAllowed: 12 },
  // Wave 1 — learn the ropes
  { archetype: 'normal', minWordLength: 2, specialTileChance: 0.06, goldDistribution: 0.5, vowelModifier: 1.1, maxCascadeChain: 2, cascadeChainBonus: 0.5, scoreThreshold: undefined, movesAllowed: 12 },
  // Wave 2
  { archetype: 'treasureHunt', minWordLength: 2, specialTileChance: 0.06, goldDistribution: 0.5, vowelModifier: 0.95, maxCascadeChain: 2, cascadeChainBonus: 0.6, scoreThreshold: undefined, movesAllowed: 10 },
  // Wave 3 — score threshold kicks in
  { archetype: 'normal', minWordLength: 2, specialTileChance: 0.07, goldDistribution: 0.5, vowelModifier: 0.9, maxCascadeChain: 2, cascadeChainBonus: 0.7, scoreThreshold: 80, movesAllowed: 9 },
  // Wave 4
  { archetype: 'scoreRush', minWordLength: 2, specialTileChance: 0.08, goldDistribution: 0.5, vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.8, scoreThreshold: 180, movesAllowed: 8 },
  // Wave 5
  { archetype: 'normal', minWordLength: 2, specialTileChance: 0.08, goldDistribution: 0.5, vowelModifier: 0.85, maxCascadeChain: 3, cascadeChainBonus: 0.9, scoreThreshold: 250, movesAllowed: 7 },
  // Wave 6
  { archetype: 'survival', minWordLength: 2, specialTileChance: 0.09, goldDistribution: 0.5, vowelModifier: 0.82, maxCascadeChain: 3, cascadeChainBonus: 0.95, scoreThreshold: 350, movesAllowed: 7 },
  // Wave 7
  { archetype: 'treasureHunt', minWordLength: 2, specialTileChance: 0.10, goldDistribution: 0.5, vowelModifier: 0.82, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 450, movesAllowed: 6 },
  // Wave 8
  { archetype: 'scoreRush', minWordLength: 2, specialTileChance: 0.10, goldDistribution: 0.5, vowelModifier: 0.8, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 500, movesAllowed: 6 },
  // Wave 9
  { archetype: 'survival', minWordLength: 2, specialTileChance: 0.11, goldDistribution: 0.5, vowelModifier: 0.78, maxCascadeChain: 4, cascadeChainBonus: 1.0, scoreThreshold: 550, movesAllowed: 5 },
  // Wave 10
  { archetype: 'normal', minWordLength: 2, specialTileChance: 0.12, goldDistribution: 0.5, vowelModifier: 0.76, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 600, movesAllowed: 5 },
  // Wave 11
  { archetype: 'scoreRush', minWordLength: 2, specialTileChance: 0.12, goldDistribution: 0.5, vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 650, movesAllowed: 6 },
  // Wave 12+
  { archetype: 'survival', minWordLength: 2, specialTileChance: 0.13, goldDistribution: 0.5, vowelModifier: 0.75, maxCascadeChain: 5, cascadeChainBonus: 1.0, scoreThreshold: 700, movesAllowed: 6 },
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

  const { params } = getWaveTheme(wave);
  config.specialTileChance = Math.min(0.3, config.specialTileChance * params.specialChanceMultiplier);
  config.goldDistribution = params.goldShare;
  config.movesAllowed = Math.max(4, config.movesAllowed + params.movesDelta);
  config.cascadeChainBonus *= params.cascadeBonusMultiplier;
  config.maxCascadeChain += params.maxCascadeDelta;
  // A theme that cuts moves must not leave the threshold out of reach.
  if (config.scoreThreshold !== undefined) {
    config.scoreThreshold = Math.min(config.scoreThreshold, config.movesAllowed * MAX_SCORE_PER_MOVE);
  }
  return config;
}

/** Best sustainable score per move for a skilled player — the threshold ceiling. */
const MAX_SCORE_PER_MOVE = 120;

// ==================== Wave Objectives ====================

import type { BlastObjective, WaveResult } from '../types';
import { calculateEarnedStars } from './blastStarCalculator';
import { getTargetWordPool, pickRandomTargetWord } from './blastTargetWordPool';
import { getWaveTheme, type BlastWaveThemeId } from './blastWaveTheme';

export { getWaveTheme, BLAST_WAVE_THEME_IDS } from './blastWaveTheme';
export type { BlastWaveTheme, BlastWaveThemeId, BlastWaveThemeParams, BlastWaveAccentToken } from './blastWaveTheme';

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

function themeGoal(id: BlastWaveThemeId, wave: number, tier: number): BlastObjective {
  switch (id) {
    case 'warmUp':
      return { type: 'word_length', target: 4, minWordLength: 3 };
    case 'bombSquad':
      return { type: 'collect_type', tileType: 'bomb', target: 2 + tier };
    case 'coinRush':
      return { type: 'collect_type', tileType: 'gold', target: 3 + tier };
    case 'diamondHunt':
      return { type: 'collect_type', tileType: 'diamond', target: 1 + tier };
    case 'boss':
      return { type: 'score_target', target: 150 + wave * 40 };
    case 'cascadeCarnival':
      return { type: 'word_length', target: 2 + tier, minWordLength: 5 };
  }
}

/**
 * Objectives for a wave: clear the board, the wave theme's own goal, and (after
 * the warm-up, outside boss waves whose goal already is a score) a score target.
 */
export function getWaveObjectives(wave: number, language?: string): BlastObjective[] {
  const clamped = Math.max(wave, 1);
  const theme = getWaveTheme(clamped);
  const base: BlastObjective[] = [CLEAR_BOARD, themeGoal(theme.id, clamped, theme.tier)];
  if (clamped > 1 && theme.id !== 'boss') base.push({ type: 'score_target', target: 40 + clamped * 30 });

  const withTargetWord = seedTargetWordObjective(clamped, language ?? 'en', base);
  return capWaveObjectives(seedColorPowerObjective(clamped, withTargetWord));
}

export interface BlastWaveClearReward {
  coins: number;
  stars: 1 | 2 | 3;
  /** Extra coins for a three-star clear */
  chestBonus: number;
}

/** Coins + stars + a three-star chest bonus for clearing a wave, scaled by its theme. */
export function getWaveClearReward(wave: number, stars: 1 | 2 | 3): BlastWaveClearReward {
  const { params } = getWaveTheme(wave);
  const coins = Math.round((20 + 5 * Math.max(1, wave)) * params.rewardMultiplier * (1 + 0.5 * (stars - 1)));
  return { coins, stars, chestBonus: stars === 3 ? Math.round(coins / 2) : 0 };
}

/** A finished wave's summary, stamped with the stars and reward it earned. */
export function buildWaveResult(waveNumber: number, score: number, wordsFound: number, clearPercentage: number): WaveResult {
  const stars = calculateEarnedStars(clearPercentage, 100);
  return { waveNumber, score, wordsFound, clearPercentage, reward: getWaveClearReward(waveNumber, stars) };
}

export function totalWaveRewardCoins(waves: readonly WaveResult[]): number {
  return waves.reduce((sum, w) => sum + (w.reward ? w.reward.coins + w.reward.chestBonus : 0), 0);
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

/** Random-spawn split for a wave. Diamonds stay at 0: they are earned by rare words, never rolled. */
export function getWaveDistribution(config: WaveConfig): Record<string, number> {
  const gold = Math.min(1, Math.max(0, config.goldDistribution));
  return { gold, bomb: 1 - gold, diamond: 0 };
}
