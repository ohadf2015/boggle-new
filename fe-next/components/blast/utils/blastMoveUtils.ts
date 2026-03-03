/**
 * blastMoveUtils — Pure utility functions for move counter system.
 * No React dependencies — trivially testable.
 */

/** Word length threshold for +1 bonus move */
export const BONUS_MOVE_THRESHOLD_SMALL = 6;

/** Word length threshold for +2 bonus moves */
export const BONUS_MOVE_THRESHOLD_LARGE = 8;

/** Bonus moves awarded for words >= BONUS_MOVE_THRESHOLD_SMALL letters */
export const BONUS_MOVE_SMALL = 1;

/** Bonus moves awarded for words >= BONUS_MOVE_THRESHOLD_LARGE letters */
export const BONUS_MOVE_LARGE = 2;

/** Points awarded per leftover move when objectives are met */
export const LEFTOVER_MOVE_BONUS_POINTS = 5;

/**
 * Calculate bonus moves earned from a word based on its length.
 * 6-7 letters = +1, 8+ letters = +2, shorter = 0.
 */
export function calculateBonusMoves(wordLength: number): number {
  if (wordLength >= BONUS_MOVE_THRESHOLD_LARGE) return BONUS_MOVE_LARGE;
  if (wordLength >= BONUS_MOVE_THRESHOLD_SMALL) return BONUS_MOVE_SMALL;
  return 0;
}

/**
 * Calculate bonus score from leftover moves at end of level.
 * Each remaining move = LEFTOVER_MOVE_BONUS_POINTS points.
 */
export function calculateLeftoverMoveBonus(movesRemaining: number): number {
  if (movesRemaining <= 0) return 0;
  return movesRemaining * LEFTOVER_MOVE_BONUS_POINTS;
}
