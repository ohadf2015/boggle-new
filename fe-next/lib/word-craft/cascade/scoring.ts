import type { ScoringTile } from '../types';
import type { PowerCard } from '../run/powerCards';
import { applyCardEffects } from '../run/cardEffects';

export const MIN_WORD_LEN = 3;
export const MAX_CHAIN_MULT = 5;

const LENGTH_BONUS: ReadonlyArray<number> = [
  0,    // 0
  0,    // 1
  0,    // 2 — below minimum
  1.0,  // 3
  1.2,  // 4
  1.5,  // 5
  2.0,  // 6
  3.0,  // 7
];
const LENGTH_BONUS_CAP = 4.0; // length 8+

export function lengthBonus(length: number): number {
  if (length < MIN_WORD_LEN) return 0;
  if (length >= LENGTH_BONUS.length) return LENGTH_BONUS_CAP;
  return LENGTH_BONUS[length];
}

export function chainMultiplier(chainCount: number): number {
  if (chainCount <= 1) return 1;
  return Math.min(MAX_CHAIN_MULT, 1 + 0.5 * (chainCount - 1));
}

export interface ScoreCascadeInput {
  wordTiles: readonly ScoringTile[];
  chainCount: number;
  wordIndexInRound: number;
  activeCards: readonly PowerCard[];
}

/**
 * Cascade scoring formula:
 *   final = floor( sumLetterValues × lengthBonus × cardMultipliers × chainMult )
 *
 * Card multipliers are applied via the existing `applyCardEffects` pipeline
 * (chips + mult composition). chainMult is applied last and capped.
 */
export function scoreCascadeWord(input: ScoreCascadeInput): number {
  const { wordTiles, chainCount, wordIndexInRound, activeCards } = input;
  const length = wordTiles.length;
  if (length < MIN_WORD_LEN) return 0;

  const baseChips = wordTiles.reduce((sum, t) => sum + t.value, 0);
  const baseMult = lengthBonus(length);
  const ctx = { wordTiles, wordLength: length, wordIndexInRound, baseChips, baseMult };
  const word = applyCardEffects(ctx, activeCards);

  const chain = chainMultiplier(chainCount);
  return Math.floor(word.total * chain);
}
