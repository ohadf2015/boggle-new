/**
 * Tests for Overflow Surge payout — the reward for suppressed chain detonations.
 */
import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../utils/clearTilesProcessor';
import type { BlastTileState } from '@/shared/types/blast';
import { BLAST_MAX_CHAIN_DETONATIONS, OVERFLOW_SURGE_POINTS_PER_DETONATION } from '../types';

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

function boardOfBombs(): BlastTileState[][] {
  // Every cell a bomb → chain detonations guaranteed to exhaust the budget.
  return Array.from({ length: GRID }, (_, r) => Array.from({ length: GRID }, (_, c) => tile(r, c, 'bomb')));
}

describe('overflow surge', () => {
  it('caps detonations at the new tighter budget and pays surge points for suppressed ones', () => {
    const prev = boardOfBombs();
    // One bomb in the word (two bombs would be a combo), ringed by bombs it catches.
    prev[2][3] = tile(2, 3);
    prev[3][2] = tile(3, 2);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 2 }];
    const res = processTilesForWord({
      prev, path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 3, rng: () => 0.5,
    });
    expect(BLAST_MAX_CHAIN_DETONATIONS).toBe(2);
    // The played bombs go off, but caught bombs stop well before the board is gone.
    // The played bomb clears its full 3x3 and sets off at most one more; the rest stay quiet.
    expect(res.newlyClearedCount).toBeGreaterThan(9);
    expect(res.newlyClearedCount).toBeLessThanOrEqual(9 + 8);
    // With a board of bombs the cap is hit, so the suppressed ones pay as surge.
    expect(res.overflowSurge).toBeGreaterThan(0);
    // Each suppressed detonation pays 8-20ish points for a 3-letter word, never the old flat 10 each
    if (res.overflowSurge > 0) {
      expect(res.overflowSurge).toBeGreaterThanOrEqual(OVERFLOW_SURGE_POINTS_PER_DETONATION * 0.5);
    }
  });

  it('no surge when nothing is suppressed', () => {
    const prev = Array.from({ length: GRID }, (_, r) => Array.from({ length: GRID }, (_, c) => tile(r, c)));
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const res = processTilesForWord({
      prev, path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 3, rng: () => 0.5,
    });
    expect(res.overflowSurge).toBe(0);
  });
});
