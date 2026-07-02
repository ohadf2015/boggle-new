/**
 * Tests for Mystery tile — the surprise outcome resolver.
 */
import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../clearTilesProcessor';
import type { BlastTileState } from '../../types';

const GRID = 6;

function tile(row: number, col: number, type: BlastTileState['type'] = 'standard', overrides?: Partial<BlastTileState>): BlastTileState {
  return {
    uid: `${row}-${col}`,
    row, col, type,
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
    ...overrides,
  };
}

function emptyBoard(): BlastTileState[][] {
  return Array.from({ length: GRID }, (_, r) =>
    Array.from({ length: GRID }, (_, c) => tile(r, c))
  );
}

function clone(grid: BlastTileState[][]): BlastTileState[][] {
  return grid.map(row => row.map(t => ({ ...t })));
}

const rngOf = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('processTilesForWord — mystery tile', () => {
  it('mystery tile in path resolves via seeded rng: scoreBurst adds points', () => {
    const prev = emptyBoard();
    prev[0][0] = tile(0, 0, 'mystery');
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const low = processTilesForWord({ prev: clone(prev), path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 5, rng: rngOf(0.1, 0.5) });
    const high = processTilesForWord({ prev: clone(prev), path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 5, rng: rngOf(0.999, 0.5) });
    // Different outcomes should yield different scores
    expect(low.totalScore).not.toBe(high.totalScore);
  });

  it('mystery tile is cleared when processed', () => {
    const prev = emptyBoard();
    prev[2][2] = tile(2, 2, 'mystery');
    const path = [{ row: 2, col: 2 }];
    const result = processTilesForWord({
      prev, path, word: 'A', baseScore: 5, gridSize: GRID, currentWave: 5, rng: rngOf(0.1, 0.5),
    });
    expect(result.next[2][2].isCleared).toBe(true);
  });

  it('mystery tile roll < 0.45 yields scoreBurst outcome', () => {
    const prev = emptyBoard();
    prev[0][0] = tile(0, 0, 'mystery');
    const path = [{ row: 0, col: 0 }];
    // First rng() call returns 0.1 (< 0.45), second is used for the points
    const result = processTilesForWord({
      prev, path, word: 'A', baseScore: 5, gridSize: GRID, currentWave: 5, rng: rngOf(0.1, 0.5),
    });
    // Score should include both baseScore (5) and the burst points (25-60 range)
    expect(result.totalScore).toBeGreaterThan(5);
  });
});
