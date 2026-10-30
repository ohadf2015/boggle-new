import { describe, it, expect } from 'vitest';
import { tileCharBonus } from '../tileCharBonus';

const grid = [['C', 'A', 'T'], ['D', 'O', 'G']];

describe('tileCharBonus', () => {
  it('pays the rate (rounded up) when the word uses a letter on a marked tile', () => {
    expect(tileCharBonus('cat', [{ row: 0, col: 0 }], grid, 10, 0.25)).toBe(3);
    expect(tileCharBonus('dog', [{ row: 1, col: 1 }], grid, 10, 0.5)).toBe(5);
  });

  it('pays nothing when no marked letter is used, or nothing is marked', () => {
    expect(tileCharBonus('cat', [{ row: 1, col: 2 }], grid, 10, 0.5)).toBe(0);
    expect(tileCharBonus('cat', [], grid, 10, 0.5)).toBe(0);
    expect(tileCharBonus('cat', undefined, grid, 10, 0.5)).toBe(0);
    expect(tileCharBonus('cat', [{ row: 0, col: 0 }], null, 10, 0.5)).toBe(0);
  });

  it('ignores tiles that fall off the grid', () => {
    expect(tileCharBonus('cat', [{ row: 9, col: 9 }], grid, 10, 0.5)).toBe(0);
  });
});
