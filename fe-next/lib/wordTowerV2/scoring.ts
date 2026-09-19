/**
 * Word Tower v2 scoring.
 *
 * v1 paid a long word in bonus metres — a number that appeared and vanished.
 * Here a long word buys a *wider block*, which is a better platform for the next
 * drop. The reward stays on the screen and changes how the rest of the run plays.
 */

/** 34 read as slivers, 46/56 still small next to the wheel (rounds 4-5). */
export const BLOCK_HEIGHT_PX = 76;

/** Round 5: 96+14/letter left half the screen empty beside the tower. */
const MIN_BLOCK_WIDTH_PX = 150;
const WIDTH_PER_LETTER_PX = 16;
/** Beyond this, extra letters stop widening the block (keeps the swing on screen). */
const MAX_WORD_LETTERS = 8;

/** Points per metre climbed. Height is measured from physics, not accumulated. */
const POINTS_PER_M = 100;

export function blockWidthForWord(word: string): number {
  const letters = Math.min(word.length, MAX_WORD_LETTERS);

  return MIN_BLOCK_WIDTH_PX + letters * WIDTH_PER_LETTER_PX;
}

/**
 * Score is a pure function of the tower's measured height. There is no running
 * total to drift out of sync with what the player can see — if the tower falls,
 * the score falls with it, because the score *is* the tower.
 */
export function scoreFromHeightM(heightM: number): number {
  return Math.round(Math.max(0, heightM) * POINTS_PER_M);
}
