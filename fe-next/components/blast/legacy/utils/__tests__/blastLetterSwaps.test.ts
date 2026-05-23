/**
 * applyVortexLetterSwaps — shared pure helper used by BOTH the client engine
 * (useBlastEngine) and the authoritative server (wordValidationHandler) so that
 * a vortex/magnet letter swap is applied identically on both sides. Before this
 * helper the server applied the vortex *tile-type* swaps (via processTilesForWord)
 * but never the matching *letter* swaps to its grid, so its grid and tileStates
 * disagreed and it broadcast blank/white tiles + a board the next word couldn't
 * validate against.
 */

import { applyVortexLetterSwaps } from '../blastLetterSwaps';

describe('applyVortexLetterSwaps', () => {
  it('returns the same grid reference when there are no swaps', () => {
    const grid = [['A', 'B'], ['C', 'D']];
    expect(applyVortexLetterSwaps(grid, [])).toBe(grid);
  });

  it('swaps two letters by position without mutating the input grid', () => {
    const grid = [['A', 'B'], ['C', 'D']];
    const out = applyVortexLetterSwaps(grid, [{ fromR: 0, fromC: 0, toR: 1, toC: 1 }]);
    expect(out).toEqual([['D', 'B'], ['C', 'A']]);
    // input untouched (immutability — callers rely on a fresh grid)
    expect(grid).toEqual([['A', 'B'], ['C', 'D']]);
  });

  it('applies multiple swaps in submitted order', () => {
    const grid = [['A', 'B', 'C']];
    const out = applyVortexLetterSwaps(grid, [
      { fromR: 0, fromC: 0, toR: 0, toC: 1 }, // A<->B => B A C
      { fromR: 0, fromC: 1, toR: 0, toC: 2 }, // A<->C => B C A
    ]);
    expect(out).toEqual([['B', 'C', 'A']]);
  });
});
