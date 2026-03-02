/**
 * AdventureTileRules — pure functions for adventure mode tile effects.
 * Imported by both AdventureScene (Phaser) and server-side scoring logic.
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import {
  applyIceMelt,
  applyBombEffect,
  getFireMultiplier,
  applyTimeBonus,
  isRainbowTile,
  type AdventureTile,
} from '../AdventureTileRules';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTile = (overrides: Partial<AdventureTile> = {}): AdventureTile => ({
  id: 'tile-0-0',
  row: 0,
  col: 0,
  letter: 'A',
  type: 'standard',
  isCleared: false,
  isFrozen: false,
  bonusTime: 0,
  ...overrides,
});

// ─── applyIceMelt ────────────────────────────────────────────────────────────

describe('applyIceMelt', () => {
  it('marks an ice tile as cleared', () => {
    const tile = makeTile({ type: 'ice', isFrozen: true });
    const result = applyIceMelt(tile);
    expect(result.isCleared).toBe(true);
  });

  it('unfreezes the tile', () => {
    const tile = makeTile({ type: 'ice', isFrozen: true });
    const result = applyIceMelt(tile);
    expect(result.isFrozen).toBe(false);
  });

  it('is immutable — original tile unchanged', () => {
    const tile = makeTile({ type: 'ice', isFrozen: true });
    applyIceMelt(tile);
    expect(tile.isCleared).toBe(false);
  });

  it('does not crash on standard tile (graceful no-op)', () => {
    const tile = makeTile({ type: 'standard' });
    expect(() => applyIceMelt(tile)).not.toThrow();
  });
});

// ─── applyBombEffect ─────────────────────────────────────────────────────────

describe('applyBombEffect', () => {
  // 4×4 grid (16 tiles)
  const buildGrid = (): AdventureTile[] => {
    const tiles: AdventureTile[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        tiles.push(makeTile({ id: `tile-${row}-${col}`, row, col }));
      }
    }
    return tiles;
  };

  it('clears the bomb tile itself', () => {
    const grid = buildGrid();
    grid[5] = { ...grid[5], type: 'bomb' }; // row=1, col=1
    const result = applyBombEffect(grid, 1, 1);
    const bombTile = result.find((t) => t.row === 1 && t.col === 1)!;
    expect(bombTile.isCleared).toBe(true);
  });

  it('clears all tiles in the bomb row', () => {
    const grid = buildGrid();
    grid[4] = { ...grid[4], type: 'bomb' }; // row=1, col=0
    const result = applyBombEffect(grid, 1, 0);
    const rowTiles = result.filter((t) => t.row === 1);
    expect(rowTiles.every((t) => t.isCleared)).toBe(true);
  });

  it('does not clear tiles in other rows', () => {
    const grid = buildGrid();
    grid[4] = { ...grid[4], type: 'bomb' };
    const result = applyBombEffect(grid, 1, 0);
    const otherRows = result.filter((t) => t.row !== 1);
    expect(otherRows.every((t) => !t.isCleared)).toBe(true);
  });

  it('is immutable — original grid unchanged', () => {
    const grid = buildGrid();
    applyBombEffect(grid, 1, 0);
    expect(grid.every((t) => !t.isCleared)).toBe(true);
  });

  it('returns same number of tiles', () => {
    const grid = buildGrid();
    const result = applyBombEffect(grid, 0, 0);
    expect(result).toHaveLength(grid.length);
  });
});

// ─── getFireMultiplier ────────────────────────────────────────────────────────

describe('getFireMultiplier', () => {
  it('returns 1 for combo level 0', () => {
    expect(getFireMultiplier(0)).toBe(1);
  });

  it('returns value >= 1 for any combo level', () => {
    for (let level = 0; level <= 10; level++) {
      expect(getFireMultiplier(level)).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns a higher multiplier at combo level 5 than level 1', () => {
    expect(getFireMultiplier(5)).toBeGreaterThan(getFireMultiplier(1));
  });

  it('returns a number (not NaN)', () => {
    expect(Number.isNaN(getFireMultiplier(3))).toBe(false);
  });
});

// ─── applyTimeBonus ──────────────────────────────────────────────────────────

describe('applyTimeBonus', () => {
  it('returns the bonus seconds from the tile', () => {
    const tile = makeTile({ type: 'time', bonusTime: 10 });
    expect(applyTimeBonus(tile)).toBe(10);
  });

  it('returns 0 for a non-time tile', () => {
    const tile = makeTile({ type: 'standard', bonusTime: 0 });
    expect(applyTimeBonus(tile)).toBe(0);
  });
});

// ─── isRainbowTile ───────────────────────────────────────────────────────────

describe('isRainbowTile', () => {
  it('returns true for rainbow type', () => {
    expect(isRainbowTile(makeTile({ type: 'rainbow' }))).toBe(true);
  });

  it('returns false for standard type', () => {
    expect(isRainbowTile(makeTile({ type: 'standard' }))).toBe(false);
  });

  it('returns false for ice type', () => {
    expect(isRainbowTile(makeTile({ type: 'ice' }))).toBe(false);
  });
});
