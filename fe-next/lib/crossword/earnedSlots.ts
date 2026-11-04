import type { CrosswordPuzzle } from './types';

/** Solved clues the player filled themselves: a clue with any hint-revealed cell is not counted as found. */
export function earnedSlotIds(puzzle: Pick<CrosswordPuzzle, 'slots'>, solvedIds: readonly string[], revealed: readonly string[]): string[] {
  const hinted = new Set(revealed);
  const solved = new Set(solvedIds);
  return puzzle.slots
    .filter((slot) => solved.has(slot.id) && !slot.cells.some((c) => hinted.has(`${c.row},${c.col}`)))
    .map((slot) => slot.id);
}
