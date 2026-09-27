import { describe, it, expect } from 'vitest';
import {
  spreadChocolate, isChocolateContained, isBoardSwallowed, countChocolate,
} from '../blastChocolateEngine';
import type { BlastTileState } from '@/shared/types/blast';

const std = (row: number, col: number): BlastTileState => ({
  uid: `s-${row}-${col}`, row, col, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1,
});
const choc = (row: number, col: number): BlastTileState => ({
  ...std(row, col), type: 'chocolate', uid: `c-${row}-${col}`,
});

describe('blastChocolateEngine.spreadChocolate', () => {
  it('grows by exactly one cell when not contained', () => {
    const grid = [[choc(0, 0), std(0, 1)], [std(1, 0), std(1, 1)]];
    const next = spreadChocolate(grid, { seed: 42 });
    expect(countChocolate(next)).toBe(2);
  });

  it('same seed produces same target (determinism)', () => {
    const grid = [[choc(0, 0), std(0, 1), std(0, 2)], [std(1, 0), std(1, 1), std(1, 2)]];
    const a = spreadChocolate(grid, { seed: 7 });
    const b = spreadChocolate(grid, { seed: 7 });
    expect(a.flat().map(c => c.type)).toEqual(b.flat().map(c => c.type));
  });

  it('does not spread when a chocolate cell was used this turn', () => {
    const grid = [[choc(0, 0), std(0, 1)], [std(1, 0), std(1, 1)]];
    const next = spreadChocolate(grid, { seed: 1, usedCells: [{ row: 0, col: 0 }] });
    expect(countChocolate(next)).toBe(1);
  });

  it('does not spread when no adjacent standard cells exist', () => {
    const grid = [[choc(0, 0), choc(0, 1)], [choc(1, 0), choc(1, 1)]];
    const next = spreadChocolate(grid, { seed: 1 });
    expect(countChocolate(next)).toBe(4);
  });

  it('does not mutate input grid', () => {
    const grid = [[choc(0, 0), std(0, 1)]];
    spreadChocolate(grid, { seed: 1 });
    expect(grid[0][1].type).toBe('standard');
  });

  it('only spreads to 4-orthogonal neighbours (not diagonals)', () => {
    // chocolate at (0,0); neighbours at (0,1) and (1,0) only — never (1,1)
    const grid = [[choc(0, 0), std(0, 1)], [std(1, 0), std(1, 1)]];
    for (let s = 0; s < 50; s++) {
      const next = spreadChocolate(grid, { seed: s });
      expect(next[1][1].type).toBe('standard');
    }
  });
});

describe('blastChocolateEngine.isChocolateContained', () => {
  it('true when used cells include any chocolate', () => {
    const grid = [[choc(0, 0)]];
    expect(isChocolateContained(grid, [{ row: 0, col: 0 }])).toBe(true);
  });
  it('false when used cells are all non-chocolate', () => {
    const grid = [[choc(0, 0), std(0, 1)]];
    expect(isChocolateContained(grid, [{ row: 0, col: 1 }])).toBe(false);
  });
});

describe('blastChocolateEngine.isBoardSwallowed', () => {
  it('true when only chocolate (or cleared) remains', () => {
    expect(isBoardSwallowed([[choc(0, 0), choc(0, 1)]])).toBe(true);
  });
  it('false when any non-chocolate live cell remains', () => {
    expect(isBoardSwallowed([[choc(0, 0), std(0, 1)]])).toBe(false);
  });
});
