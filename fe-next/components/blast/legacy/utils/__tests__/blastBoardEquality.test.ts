/**
 * blastBoardsEqual — structural equality used to skip redundant
 * applyServerBoard() replacements in MP (kills tile flicker when the server's
 * authoritative board matches the client's optimistic prediction).
 *
 * Risk asymmetry: a false "equal" would keep a stale board (correctness bug), so
 * the comparator must cover EVERY rendered/gameplay field. uid/row/col are
 * intentionally excluded — they don't change what is drawn, and comparing uid
 * would defeat the no-op (and re-trigger the very remount we avoid).
 */
import { describe, it, expect } from 'vitest';
import { blastBoardsEqual } from '../blastBoardEquality';
import type { BlastTileState } from '@/shared/types/blast';

function tile(row: number, col: number, over: Partial<BlastTileState> = {}): BlastTileState {
  return {
    uid: `u-${row}-${col}`,
    row,
    col,
    type: 'normal',
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
    ...over,
  };
}

const GRID = [
  ['C', 'A'],
  ['D', 'O'],
];
function tiles(): BlastTileState[][] {
  return [
    [tile(0, 0), tile(0, 1)],
    [tile(1, 0), tile(1, 1)],
  ];
}

describe('blastBoardsEqual', () => {
  it('returns true for structurally identical boards', () => {
    expect(blastBoardsEqual(GRID, tiles(), GRID.map((r) => [...r]), tiles())).toBe(true);
  });

  it('returns true when only uid differs (uid is excluded)', () => {
    const a = tiles();
    const b = tiles();
    b[0][0] = { ...b[0][0], uid: 'totally-different-uid' };
    expect(blastBoardsEqual(GRID, a, GRID, b)).toBe(true);
  });

  it('returns false when a grid letter differs', () => {
    const other = [['C', 'A'], ['D', 'X']];
    expect(blastBoardsEqual(GRID, tiles(), other, tiles())).toBe(false);
  });

  it('returns false when isCleared differs', () => {
    const b = tiles();
    b[1][1] = { ...b[1][1], isCleared: true };
    expect(blastBoardsEqual(GRID, tiles(), GRID, b)).toBe(false);
  });

  it('returns false when isThawed differs (the ice-thaw divergence)', () => {
    const a = tiles();
    a[0][0] = { ...a[0][0], type: 'ice', isThawed: true };
    const b = tiles();
    b[0][0] = { ...b[0][0], type: 'ice', isThawed: false };
    expect(blastBoardsEqual(GRID, a, GRID, b)).toBe(false);
  });

  it('returns false when tile type differs', () => {
    const b = tiles();
    b[0][1] = { ...b[0][1], type: 'gem' };
    expect(blastBoardsEqual(GRID, tiles(), GRID, b)).toBe(false);
  });

  it('returns false when a secondary field (countdown) differs', () => {
    const b = tiles();
    b[1][0] = { ...b[1][0], countdown: 3 };
    expect(blastBoardsEqual(GRID, tiles(), GRID, b)).toBe(false);
  });

  it('returns false when board dimensions differ', () => {
    const smallGrid = [['C']];
    const smallTiles = [[tile(0, 0)]];
    expect(blastBoardsEqual(GRID, tiles(), smallGrid, smallTiles)).toBe(false);
  });
});
