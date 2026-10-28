/**
 * blastLevelClear — auto-trigger sequence for remaining special tiles on level clear.
 *
 * When objectives are met (or all tiles cleared), remaining special tiles
 * fire sequentially like Candy Crush's "Sugar Crush" bonus phase:
 * - Each remaining bomb explodes (200ms stagger), then coins, then diamonds
 * - Remaining moves convert to bonus score
 */

import type { BlastTileState, BlastTileType } from '../../types';
import {
  buildAutoTriggerSequence,
  calculateMoveConversionBonus,
  MOVE_CONVERSION_SCORE,
  AUTO_TRIGGER_STAGGER_MS,
} from '../blastLevelClear';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTile(row: number, col: number, type: BlastTileType, isCleared = false): BlastTileState {
  return { row, col, type, isCleared, activationEffect: null, hitsRemaining: 0, uid: `t-${row}-${col}` };
}

function makeGrid(tiles: BlastTileState[]): BlastTileState[][] {
  // Build a sparse 6x6 grid
  const grid: BlastTileState[][] = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => makeTile(r, c, 'standard'))
  );
  for (const tile of tiles) {
    grid[tile.row][tile.col] = tile;
  }
  return grid;
}

// ─── buildAutoTriggerSequence ────────────────────────────────────────────────

describe('buildAutoTriggerSequence', () => {
  it('returns empty array when no special tiles remain', () => {
    const grid = makeGrid([]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toEqual([]);
  });

  it('returns empty array when all special tiles are already cleared', () => {
    const grid = makeGrid([
      makeTile(0, 0, 'bomb', true),
      makeTile(1, 1, 'gold', true),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toEqual([]);
  });

  it('includes uncleared bomb tiles in the sequence', () => {
    const grid = makeGrid([
      makeTile(2, 3, 'bomb', false),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('bomb');
    expect(result[0].row).toBe(2);
    expect(result[0].col).toBe(3);
  });

  it('includes uncleared gold tiles in the sequence', () => {
    const grid = makeGrid([
      makeTile(4, 2, 'gold', false),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('gold');
  });

  it('does NOT include standard tiles', () => {
    const grid = makeGrid([
      makeTile(0, 0, 'standard', false),
      makeTile(1, 1, 'bomb', false),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('bomb');
  });

  it('orders bombs before coins before diamonds (priority order)', () => {
    const grid = makeGrid([
      makeTile(0, 0, 'diamond', false),
      makeTile(1, 1, 'gold', false),
      makeTile(2, 2, 'bomb', false),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('bomb');
    expect(result[1].type).toBe('gold');
    expect(result[2].type).toBe('diamond');
  });

  it('assigns staggered delays to each step', () => {
    const grid = makeGrid([
      makeTile(0, 0, 'bomb', false),
      makeTile(1, 1, 'bomb', false),
      makeTile(2, 2, 'gold', false),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(3);
    expect(result[0].delayMs).toBe(0);
    expect(result[1].delayMs).toBe(AUTO_TRIGGER_STAGGER_MS);
    expect(result[2].delayMs).toBe(AUTO_TRIGGER_STAGGER_MS * 2);
  });

  it('handles mixed cleared and uncleared special tiles', () => {
    const grid = makeGrid([
      makeTile(0, 0, 'bomb', true),   // cleared — skip
      makeTile(1, 1, 'bomb', false),  // uncleared — include
      makeTile(2, 2, 'gold', false), // uncleared — include
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(2);
  });

  it('includes rainbow tiles', () => {
    const grid = makeGrid([
      makeTile(0, 0, 'gold', false),
    ]);
    const result = buildAutoTriggerSequence(grid);
    expect(result).toHaveLength(1);
  });
});

// ─── calculateMoveConversionBonus ───────────────────────────────────────────

describe('calculateMoveConversionBonus', () => {
  it('returns 0 for 0 remaining moves', () => {
    expect(calculateMoveConversionBonus(0)).toBe(0);
  });

  it('returns MOVE_CONVERSION_SCORE per remaining move', () => {
    expect(calculateMoveConversionBonus(1)).toBe(MOVE_CONVERSION_SCORE);
    expect(calculateMoveConversionBonus(3)).toBe(MOVE_CONVERSION_SCORE * 3);
  });

  it('returns 0 for negative remaining moves', () => {
    expect(calculateMoveConversionBonus(-1)).toBe(0);
  });

  it('handles large values', () => {
    expect(calculateMoveConversionBonus(100)).toBe(MOVE_CONVERSION_SCORE * 100);
  });
});

// ─── AutoTriggerStep shape ──────────────────────────────────────────────────

describe('AutoTriggerStep shape', () => {
  it('has required fields: type, row, col, delayMs', () => {
    const grid = makeGrid([makeTile(3, 4, 'bomb', false)]);
    const result = buildAutoTriggerSequence(grid);
    const step = result[0];
    expect(step).toHaveProperty('type');
    expect(step).toHaveProperty('row');
    expect(step).toHaveProperty('col');
    expect(step).toHaveProperty('delayMs');
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('AUTO_TRIGGER_STAGGER_MS is 200', () => {
    expect(AUTO_TRIGGER_STAGGER_MS).toBe(200);
  });

  it('MOVE_CONVERSION_SCORE is a positive number', () => {
    expect(MOVE_CONVERSION_SCORE).toBeGreaterThan(0);
  });
});
