import { describe, it, expect } from 'vitest';
import {
  pickGoldenTile,
  wordUsesCell,
  goldenMultiplierFor,
  GOLDEN_TILE_CHANCE,
  GOLDEN_MULTIPLIER,
  hashSeed,
} from '../goldenTile';

const GRID = [
  ['c', 'a', 't', 'x'],
  ['x', 'x', 'e', 'x'],
  ['x', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
];

describe('pickGoldenTile', () => {
  it('is deterministic for a seed', () => {
    expect(pickGoldenTile('seed-a', GRID, 1)).toEqual(pickGoldenTile('seed-a', GRID, 1));
  });

  it('always sits on the board', () => {
    for (let i = 0; i < 200; i++) {
      const cell = pickGoldenTile(`s-${i}`, GRID, 1)!;
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(4);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(4);
    }
  });

  it('lands on roughly 60% of boards, not all of them', () => {
    let hits = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) if (pickGoldenTile(`round-${i}`, GRID)) hits++;
    expect(GOLDEN_TILE_CHANCE).toBe(0.6);
    expect(hits / n).toBeGreaterThan(0.53);
    expect(hits / n).toBeLessThan(0.67);
  });

  it('chance 1 always has one, chance 0 never does, and no seed or board means none', () => {
    expect(pickGoldenTile('x', GRID, 1)).not.toBeNull();
    expect(pickGoldenTile('x', GRID, 0)).toBeNull();
    expect(pickGoldenTile('', GRID, 1)).toBeNull();
    expect(pickGoldenTile('x', [], 1)).toBeNull();
  });

  it('hashes stably (same value in node and the browser)', () => {
    expect(hashSeed('lexiclash')).toBe(hashSeed('lexiclash'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('wordUsesCell', () => {
  it('is true when a path for the word runs through the cell', () => {
    expect(wordUsesCell(GRID, 'cat', { row: 0, col: 1 })).toBe(true);
    expect(wordUsesCell(GRID, 'ate', { row: 1, col: 2 })).toBe(true);
  });

  it('is false when the word can be traced but not through the cell', () => {
    expect(wordUsesCell(GRID, 'cat', { row: 3, col: 1 })).toBe(false);
    expect(wordUsesCell(GRID, 'dog', { row: 0, col: 0 })).toBe(false);
  });

  it('is false for a word not on the board, an off-board cell or no cell', () => {
    expect(wordUsesCell(GRID, 'zebra', { row: 0, col: 0 })).toBe(false);
    expect(wordUsesCell(GRID, 'cat', { row: 9, col: 9 })).toBe(false);
    expect(wordUsesCell(GRID, 'cat', null)).toBe(false);
  });

  it('never reuses a tile', () => {
    expect(wordUsesCell(GRID, 'catc', { row: 0, col: 0 })).toBe(false);
  });

  it('matches case-insensitively and folds Hebrew final letters', () => {
    expect(wordUsesCell([['C', 'A', 'T']], 'cat', { row: 0, col: 2 })).toBe(true);
    expect(wordUsesCell([['ש', 'ל', 'ו', 'מ']], 'שלום', { row: 0, col: 3 })).toBe(true);
  });

  it('treats a multi-letter tile as one unit', () => {
    expect(wordUsesCell([['qu', 'i', 't']], 'quit', { row: 0, col: 0 })).toBe(true);
  });
});

describe('goldenMultiplierFor', () => {
  it('doubles through the golden tile and is 1 otherwise', () => {
    expect(GOLDEN_MULTIPLIER).toBe(2);
    expect(goldenMultiplierFor(GRID, 'cat', { row: 0, col: 2 })).toBe(2);
    expect(goldenMultiplierFor(GRID, 'dog', { row: 0, col: 2 })).toBe(1);
    expect(goldenMultiplierFor(GRID, 'cat', undefined)).toBe(1);
  });
});
