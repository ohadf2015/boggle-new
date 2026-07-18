import { describe, it, expect } from 'vitest';
import { extendPath, isAdjacent, pathToWord, type Cell } from './pathTrace';

describe('pathTrace.isAdjacent', () => {
  it('true for 8-neighbours, false for self and distant', () => {
    expect(isAdjacent([1, 1], [0, 0])).toBe(true);
    expect(isAdjacent([1, 1], [2, 2])).toBe(true);
    expect(isAdjacent([1, 1], [1, 2])).toBe(true);
    expect(isAdjacent([1, 1], [1, 1])).toBe(false);
    expect(isAdjacent([0, 0], [2, 0])).toBe(false);
  });
});

describe('pathTrace.extendPath', () => {
  it('starts an empty path', () => {
    expect(extendPath([], [1, 1])).toEqual([[1, 1]]);
  });
  it('appends an adjacent unused cell', () => {
    expect(extendPath([[0, 0]], [0, 1])).toEqual([[0, 0], [0, 1]]);
  });
  it('ignores a non-adjacent cell', () => {
    expect(extendPath([[0, 0]], [2, 2])).toEqual([[0, 0]]);
  });
  it('ignores re-entering the same last cell', () => {
    expect(extendPath([[0, 0], [0, 1]], [0, 1])).toEqual([[0, 0], [0, 1]]);
  });
  it('backtracks when entering the second-to-last cell', () => {
    expect(extendPath([[0, 0], [0, 1], [0, 2]], [0, 1])).toEqual([[0, 0], [0, 1]]);
  });
  it('ignores an already-used cell that is not a backtrack', () => {
    // path 0,0 -> 0,1 -> 1,1 ; re-entering 0,0 (used, adjacent to 1,1, not 2nd-to-last) → no-op
    const p: Cell[] = [[0, 0], [0, 1], [1, 1]];
    expect(extendPath(p, [0, 0])).toEqual(p);
  });
});

describe('pathTrace.pathToWord', () => {
  it('reads letters along the path', () => {
    const board = [['C', 'A'], ['T', 'X']];
    expect(pathToWord(board, [[0, 0], [0, 1], [1, 0]])).toBe('CAT');
  });
});
