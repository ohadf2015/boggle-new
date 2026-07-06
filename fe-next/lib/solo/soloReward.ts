/**
 * soloReward — pure per-mode score→coin mapping + a deterministic variable bonus.
 *
 * Wires the session-only beta modes (Shiritori, Sealed Bid, Crossword)
 * into the existing coin economy (`utils/coinManager`) WITHOUT new infra. Each mode's
 * score→coin mapping is an explicit, tested function — this is also the "is the reward
 * fair/fun" knob, so it is never an inline expression.
 *
 * The variable bonus is seeded (per-day) so it is a real surprise but NOT exploitable by
 * reloading the page.
 */

import { COIN_EARNING_OTHER } from '@/utils/coinManager';
import { seededRandom } from './soloDaily';

export type SoloMode = 'shiritori' | 'sealed-bid' | 'crossword';

export interface SoloRewardBreakdown {
  base: number;
  scoreBonus: number;
  winBonus: number;
}

export interface SoloRewardResult {
  /** Total coins to award = base + scoreBonus + winBonus + bonus, capped. */
  coins: number;
  breakdown: SoloRewardBreakdown;
  /** Variable surprise bonus (deterministic per seed). */
  bonus: number;
}

/** Win bonus for a solo completion — a single-player "podium" feel without rivals. */
export const SOLO_WIN_BONUS = 15;

/** Variable bonus tiers + cumulative weights (sum = 100). Mostly nothing, rarely jackpot. */
const BONUS_TIERS: { value: number; weight: number }[] = [
  { value: 0, weight: 50 },
  { value: 5, weight: 30 },
  { value: 10, weight: 15 },
  { value: 25, weight: 5 },
];

/** Roll the variable bonus deterministically from a seed. */
export function rollSoloBonus(seed: number): number {
  const roll = seededRandom(seed)() * 100;
  let acc = 0;
  for (const tier of BONUS_TIERS) {
    acc += tier.weight;
    if (roll < acc) return tier.value;
  }
  return 0;
}

export function computeSoloReward(args: {
  mode: SoloMode;
  score: number;
  won: boolean;
  seed?: number;
}): SoloRewardResult {
  const { score, won, seed = 0 } = args;

  // No engagement → no reward (keeps coins meaningful, mirrors calculateGameReward).
  if (score <= 0 && !won) {
    return { coins: 0, breakdown: { base: 0, scoreBonus: 0, winBonus: 0 }, bonus: 0 };
  }

  const base = score > 0 ? COIN_EARNING_OTHER.SINGLEPLAYER_BASE : 0;
  const scoreBonus = Math.floor(Math.max(0, score) / COIN_EARNING_OTHER.SCORE_DIVISOR);
  const winBonus = won ? SOLO_WIN_BONUS : 0;
  const bonus = rollSoloBonus(seed);

  const total = Math.min(
    base + scoreBonus + winBonus + bonus,
    COIN_EARNING_OTHER.MAX_GAME_REWARD,
  );

  return { coins: total, breakdown: { base, scoreBonus, winBonus }, bonus };
}

/**
 * Crossword is time-based — synthesize a score from solve time + hints.
 * Par = 4 min; faster than par adds points, hints subtract. Floored at 0.
 */
export function crosswordScore(elapsedMs: number, hintsUsed: number, wordsTotal: number): number {
  const parMs = 4 * 60_000;
  const speedBonus = Math.round((parMs - elapsedMs) / 4_000); // +1 per 4s under par
  const completion = Math.max(0, wordsTotal) * 6; // base for finishing the grid
  const hintPenalty = Math.max(0, hintsUsed) * 10;
  return Math.max(0, completion + speedBonus - hintPenalty);
}
