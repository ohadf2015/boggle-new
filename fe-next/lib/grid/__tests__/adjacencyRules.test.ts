import { describe, it, expect } from 'vitest';
import { isAdjacent } from '../adjacencyRules';

describe('isAdjacent — shared 8-neighbour rule', () => {
  it('returns true for orthogonal neighbours', () => {
    expect(isAdjacent({ row: 1, col: 1 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 1, col: 1 }, { row: 2, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 1, col: 1 }, { row: 1, col: 0 })).toBe(true);
    expect(isAdjacent({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
  });

  it('returns true for diagonal neighbours', () => {
    expect(isAdjacent({ row: 1, col: 1 }, { row: 0, col: 0 })).toBe(true);
    expect(isAdjacent({ row: 1, col: 1 }, { row: 0, col: 2 })).toBe(true);
    expect(isAdjacent({ row: 1, col: 1 }, { row: 2, col: 0 })).toBe(true);
    expect(isAdjacent({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(true);
  });

  it('returns false for the same cell', () => {
    expect(isAdjacent({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(false);
  });

  it('returns false for cells two or more apart', () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 2, col: 0 })).toBe(false);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
  });
});
