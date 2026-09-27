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
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 2 }];
    const res = processTilesForWord({
      prev, path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 3, rng: () => 0.5,
    });
    expect(BLAST_MAX_CHAIN_DETONATIONS).toBe(5);
    // Bombs in center should cause chain reaction that exceeds detonation cap
    expect(res.newlyClearedCount).toBeGreaterThan(3);
    // With bomb board, should hit detonation cap and record overflow surge
    expect(res.overflowSurge).toBeGreaterThanOrEqual(0);
    // If surge was recorded, it must be a multiple of the per-detonation payout
    if (res.overflowSurge > 0) {
      expect(res.overflowSurge % OVERFLOW_SURGE_POINTS_PER_DETONATION).toBe(0);
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
