/**
 * Shared vortex/magnet letter-swap application.
 *
 * `processTilesForWord` returns `vortexLetterSwaps` describing how a vortex /
 * magnet pull rearranges letters on the board. Both the client engine and the
 * authoritative server must apply these identically to their grid, otherwise
 * the grid and the (already-swapped) tileStates disagree — which strands blank
 * `{standard, isCleared:false, letter:''}` tiles and makes the next word
 * validate against a board that doesn't match what the player sees.
 *
 * Returns a NEW grid (or the same reference when there is nothing to swap);
 * never mutates the input.
 */
export interface LetterSwap {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

export function applyVortexLetterSwaps(
  grid: string[][],
  swaps: readonly LetterSwap[],
): string[][] {
  if (!swaps || swaps.length === 0) return grid;
  const next = grid.map((row) => [...row]);
  for (const s of swaps) {
    const tmp = next[s.fromR][s.fromC];
    next[s.fromR][s.fromC] = next[s.toR][s.toC];
    next[s.toR][s.toC] = tmp;
  }
  return next;
}
