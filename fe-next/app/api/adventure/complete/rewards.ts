/**
 * Pure XP + gold math for POST /api/adventure/complete.
 * Split from route.ts. No I/O — all inputs passed in, output is the earned amount.
 */

import { getUpgradeEffect, getUpgradeTier, type UpgradeState } from '@/lib/adventure/upgradeConfig';

const XP_PER_STAR = 25;
const BASE_COMPLETION_XP = 50;
const MAX_GOLD_PER_LEVEL = 500;
export const DAILY_GOLD_CAP = 5000;
const FLASH_CHALLENGE_GOLD = 25;
const LONG_WORD_MIN_LENGTH = 6;
const LONG_WORD_CLAMP = 20;

/**
 * Count server-validated long words (6+ letters) from the client-supplied list.
 * Clamped to a plausible max to prevent bonus inflation.
 */
export function countLongWords(wordsFound: unknown): number {
  if (!Array.isArray(wordsFound)) return 0;
  const count = wordsFound.filter(
    (w) => typeof w === 'string' && w.length >= LONG_WORD_MIN_LENGTH
  ).length;
  return Math.min(count, LONG_WORD_CLAMP);
}

/**
 * XP earned for a level completion.
 * First completion: base + stars * per-star. Replay improving stars: delta * per-star.
 */
export function calcXpEarned(params: {
  isFirstCompletion: boolean;
  stars: number;
  starsGained: number;
}): number {
  if (params.isFirstCompletion) {
    return BASE_COMPLETION_XP + params.stars * XP_PER_STAR;
  }
  if (params.starsGained > 0) {
    return params.starsGained * XP_PER_STAR;
  }
  return 0;
}

export interface GoldCalcParams {
  stars: number;
  world: number;
  isReplay: boolean;
  isFirstCompletion: boolean;
  starsGained: number;
  upgrades: UpgradeState;
  clampedLongWords: number;
  flashChallengeCompleted: boolean;
}

/**
 * Gold earned for a level completion.
 *
 * Rules (kept identical to the pre-split route.ts logic):
 *   - Base scales with world and stars to prevent late-game drought.
 *   - Salvage Claw (failureGold) grants a consolation on 0-star attempts.
 *   - Perfect clear (3 stars) adds a flat 50.
 *   - Cargo Bay adds per-long-word bonus.
 *   - Flash challenge: fixed 25 if completed.
 *   - Lucky Pickaxe: ADDITIVE on base (prevents economy inflation).
 *   - Replay with no star gain: 50% penalty on base gold only.
 *   - Lucky Pickaxe T4: doubles gold on first-ever completion.
 *   - Capped at MAX_GOLD_PER_LEVEL.
 */
export function calcGoldEarned(params: GoldCalcParams): number {
  const {
    stars, world, isReplay, isFirstCompletion, starsGained,
    upgrades, clampedLongWords, flashChallengeCompleted,
  } = params;

  const failureGoldEffect = getUpgradeEffect(upgrades, 'failureGold') || 0;
  const baseGold = stars === 0 && failureGoldEffect > 0
    ? Math.floor((10 + world * 3) * failureGoldEffect)
    : (10 + world * 3) * stars;
  const perfectClearGoldBonus = stars === 3 ? 50 : 0;

  const cargoBayEffect = getUpgradeEffect(upgrades, 'cargoBay') || 0;
  const longWordBonus = clampedLongWords * cargoBayEffect;

  const flashGold = flashChallengeCompleted ? FLASH_CHALLENGE_GOLD : 0;

  let goldEarned = baseGold + perfectClearGoldBonus + longWordBonus + flashGold;

  const luckyPickaxeBonus = getUpgradeEffect(upgrades, 'luckyPickaxe') || 0;
  if (luckyPickaxeBonus > 0) {
    goldEarned = Math.round(goldEarned + baseGold * luckyPickaxeBonus);
  }

  // Replay penalty: 50% on BASE gold only — bonuses stay un-penalized.
  if (isReplay && starsGained === 0) {
    const penalizedBase = Math.floor(baseGold * 0.5);
    goldEarned = penalizedBase + perfectClearGoldBonus + longWordBonus + flashGold;
    if (luckyPickaxeBonus > 0) {
      goldEarned = Math.round(goldEarned + baseGold * luckyPickaxeBonus);
    }
  }

  if (isFirstCompletion && getUpgradeTier(upgrades, 'luckyPickaxe') >= 4) {
    goldEarned = goldEarned * 2;
  }

  return Math.min(goldEarned, MAX_GOLD_PER_LEVEL);
}
