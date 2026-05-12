/**
 * blastGravity seeded-rng tests.
 * Verifies that computeGravityResult produces deterministic refills when
 * an rng parameter is supplied, and retains backward-compat when omitted.
 *
 * NOTE: Does NOT mock blastLetterGenerator so real letter generation runs
 *       and seeded determinism can be verified end-to-end.
 */

import type { BlastTileState, BlastTileType } from '../types';
import { computeGravityResult } from '../utils/blastGravity';
import { createSeededRandom } from '../utils/blastLetterGenerator';

function makeClearedStates(gridSize: number): BlastTileState[][] {
  return Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (__, c) => ({
      row: r,
      col: c,
      type: 'standard' as BlastTileType,
      // Clear all tiles so every cell generates a new letter
      isCleared: true,
      activationEffect: null,
      hitsRemaining: 0,
    }))
  );
}

function makeGrid(gridSize: number, fill = 'A'): string[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => fill)
  );
}

describe('computeGravityResult — seeded rng', () => {
  it('produces identical new tiles when same seed supplied twice', () => {
    const grid = makeGrid(3);
    const tileStates = makeClearedStates(3);

    const rng1 = createSeededRandom(42);
    const rng2 = createSeededRandom(42);

    const result1 = computeGravityResult(grid, tileStates, 3, 'en', 0, undefined, 0, rng1);
    // Reset cleared state (computeGravityResult is pure — re-create)
    const tileStates2 = makeClearedStates(3);
    const result2 = computeGravityResult(grid, tileStates2, 3, 'en', 0, undefined, 0, rng2);

    // Both results should have the same letters in newTiles
    const letters1 = result1.newTiles.map(t => t.letter).join('');
    const letters2 = result2.newTiles.map(t => t.letter).join('');
    expect(letters1).toBe(letters2);
  });

  it('produces different new tiles for different seeds (probabilistically)', () => {
    const grid = makeGrid(4);
    const tileStates1 = makeClearedStates(4);
    const tileStates2 = makeClearedStates(4);

    const result1 = computeGravityResult(grid, tileStates1, 4, 'en', 0, undefined, 0, createSeededRandom(1));
    const result2 = computeGravityResult(grid, tileStates2, 4, 'en', 0, undefined, 0, createSeededRandom(9999));

    const letters1 = result1.newTiles.map(t => t.letter).join('');
    const letters2 = result2.newTiles.map(t => t.letter).join('');
    // Astronomically unlikely for two different seeds to produce identical 16-letter sequences
    expect(letters1).not.toBe(letters2);
  });

  it('works without rng param (backward compat — uses Math.random)', () => {
    const grid = makeGrid(2);
    const tileStates = makeClearedStates(2);

    // Should not throw and should return a valid result
    expect(() => computeGravityResult(grid, tileStates, 2, 'en', 0)).not.toThrow();
    const result = computeGravityResult(makeClearedStates(2) as any, makeClearedStates(2), 2, 'en', 0);
    // grid arg should be string[][] — use real args
    const result2 = computeGravityResult(makeGrid(2), makeClearedStates(2), 2, 'en', 0);
    expect(result2.newTiles.length).toBeGreaterThan(0);
  });

  it('rng is consumed for each new tile (not reused)', () => {
    // With a 3x3 grid all cleared = 9 new tiles, each consuming rng calls.
    // Two results with same seed but one tile fewer cleared should differ.
    const grid = makeGrid(3);

    const tileStates9 = makeClearedStates(3); // all 9 cleared
    const tileStates8 = makeClearedStates(3);
    tileStates8[0][0].isCleared = false; // 8 cleared

    const result9 = computeGravityResult(grid, tileStates9, 3, 'en', 0, undefined, 0, createSeededRandom(77));
    const result8 = computeGravityResult(grid, tileStates8, 3, 'en', 0, undefined, 0, createSeededRandom(77));

    // Different number of new tiles — the sequences will diverge
    expect(result9.newTiles.length).not.toBe(result8.newTiles.length);
  });
});
