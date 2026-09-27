/**
 * blastMoveUtils — Pure utility functions for move counter system.
 * No React dependencies — trivially testable.
 */

import type { BlastGameState } from '../types';

/** Word length threshold for +1 bonus move */
export const BONUS_MOVE_THRESHOLD_SMALL = 6;

/** Word length threshold for +2 bonus moves */
export const BONUS_MOVE_THRESHOLD_MEDIUM = 7;

/** Word length threshold for +3 bonus moves */
export const BONUS_MOVE_THRESHOLD_LARGE = 8;

/** Word length threshold for +4 bonus moves */
export const BONUS_MOVE_THRESHOLD_EPIC = 10;

/** Bonus moves awarded for words >= 6 letters */
export const BONUS_MOVE_SMALL = 1;

/** Bonus moves awarded for words >= 7 letters */
export const BONUS_MOVE_MEDIUM = 2;

/** Bonus moves awarded for words >= 8 letters */
export const BONUS_MOVE_LARGE = 3;

/** Bonus moves awarded for words >= 10 letters */
export const BONUS_MOVE_EPIC = 4;

/** Points awarded per leftover move when objectives are met */
export const LEFTOVER_MOVE_BONUS_POINTS = 5;

/**
 * Calculate bonus moves earned from a word based on its length.
 * 6 letters = +1, 7 letters = +2, 8-9 letters = +3, 10+ letters = +4.
 */
export function calculateBonusMoves(wordLength: number): number {
  if (wordLength >= BONUS_MOVE_THRESHOLD_EPIC) return BONUS_MOVE_EPIC;
  if (wordLength >= BONUS_MOVE_THRESHOLD_LARGE) return BONUS_MOVE_LARGE;
  if (wordLength >= BONUS_MOVE_THRESHOLD_MEDIUM) return BONUS_MOVE_MEDIUM;
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

/**
 * Revive a dead-end run by clearing isDeadEnd and appending bonus moves.
 * No-op for infinite-move modes (MP) since `Infinity + N = Infinity`.
 */
export function applyRevive(prev: BlastGameState, bonusMoves: number): BlastGameState {
  if (!isFinite(prev.totalMoves)) return prev;
  const bonus = Math.max(0, bonusMoves);
  return {
    ...prev,
    isDeadEnd: false,
    movesRemaining: prev.movesRemaining + bonus,
    totalMoves: prev.totalMoves + bonus,
  };
}
