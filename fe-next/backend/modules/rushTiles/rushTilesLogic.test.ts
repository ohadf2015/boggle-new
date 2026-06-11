/**
 * Tests for pure rush-tile logic (spawn positions, cadence, scoring).
 * Pure functions only — the socket/timer manager wiring is tested via the
 * manager's behaviour, not here (supertest route tests are broken under the
 * backend vitest config).
 */
import { describe, it, expect } from 'vitest';
import {
  computeRushTilePositions,
  nextRushDelayMs,
  computeRushBonus,
  rushTileCountForGrid,
  RUSH_TILE_DURATION_MS,
  RUSH_BONUS_MULT,
} from './rushTilesLogic';

/** Deterministic RNG returning a fixed queue of values, looping. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

describe('computeRushTilePositions', () => {
  it('returns the requested number of distinct in-bounds tiles', () => {
    // Given a 4x4 grid and a deterministic rng
    const rng = seqRng([0, 0, 0.5, 0.5, 0.99, 0.99]);
    // When asking for 3 tiles
    const tiles = computeRushTilePositions(4, 4, 3, rng);
    // Then exactly 3 distinct in-bounds tiles come back
    expect(tiles).toHaveLength(3);
    const keys = new Set(tiles.map(t => `${t.row},${t.col}`));
    expect(keys.size).toBe(3);
    for (const t of tiles) {
      expect(t.row).toBeGreaterThanOrEqual(0);
      expect(t.row).toBeLessThan(4);
      expect(t.col).toBeGreaterThanOrEqual(0);
      expect(t.col).toBeLessThan(4);
    }
  });

  it('never exceeds the number of available cells', () => {
    // Given a tiny 1x1 grid
    const tiles = computeRushTilePositions(1, 1, 5, seqRng([0]));
    // Then it caps at the single available cell, no infinite loop
    expect(tiles).toHaveLength(1);
  });

  it('excludes positions in the exclude set', () => {
    // Given (0,0) excluded on a 2x2 grid, rng that would pick (0,0) first
    const exclude = new Set(['0,0']);
    const tiles = computeRushTilePositions(2, 2, 2, seqRng([0, 0, 0.6, 0.6, 0, 0.6, 0.6, 0]), exclude);
    // Then (0,0) never appears
    expect(tiles.some(t => t.row === 0 && t.col === 0)).toBe(false);
  });
});

describe('nextRushDelayMs', () => {
  it('returns a value within [min, max]', () => {
    expect(nextRushDelayMs(seqRng([0]), 18_000, 26_000)).toBe(18_000);
    expect(nextRushDelayMs(seqRng([1]), 18_000, 26_000)).toBe(26_000);
    expect(nextRushDelayMs(seqRng([0.5]), 18_000, 26_000)).toBe(22_000);
  });
});

describe('rushTileCountForGrid', () => {
  it('keeps the tile count small and grid-scaled (rare = special)', () => {
    expect(rushTileCountForGrid(4, 4)).toBe(1); // small grid -> 1 hot letter
    expect(rushTileCountForGrid(5, 5)).toBe(2); // medium -> 2
    expect(rushTileCountForGrid(6, 6)).toBe(2); // large -> 2
  });
});

describe('computeRushBonus', () => {
  const grid = [
    ['R', 'U', 'S', 'H'],
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'I'],
    ['J', 'K', 'L', 'M'],
  ];

  it('awards a bonus when the word uses a rush-tile letter and rush is active', () => {
    // Given a rush tile on (0,0)='R' and rush active
    const rushTiles = [{ row: 0, col: 0 }];
    // When scoring the word "RUSH" worth 10
    const bonus = computeRushBonus(10, 'RUSH', rushTiles, grid, true);
    // Then +50% (ceil) = 5
    expect(bonus).toBe(Math.ceil(10 * RUSH_BONUS_MULT));
  });

  it('awards nothing when rush is not active', () => {
    const rushTiles = [{ row: 0, col: 0 }];
    expect(computeRushBonus(10, 'RUSH', rushTiles, grid, false)).toBe(0);
  });

  it('awards nothing when the word does not use any rush-tile letter', () => {
    const rushTiles = [{ row: 1, col: 1 }]; // 'B'
    expect(computeRushBonus(10, 'RUSH', rushTiles, grid, true)).toBe(0);
  });

  it('awards nothing when there are no rush tiles', () => {
    expect(computeRushBonus(10, 'RUSH', [], grid, true)).toBe(0);
  });

  it('is case-insensitive', () => {
    const rushTiles = [{ row: 0, col: 2 }]; // 'S'
    expect(computeRushBonus(8, 'rush', rushTiles, grid, true)).toBe(Math.ceil(8 * RUSH_BONUS_MULT));
  });
});

describe('constants', () => {
  it('rush tiles live ~10 seconds', () => {
    expect(RUSH_TILE_DURATION_MS).toBe(10_000);
  });
});
