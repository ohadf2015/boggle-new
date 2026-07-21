import { describe, it, expect } from 'vitest';
import { pathProvesDiagonal } from './DirectionsBoardDemo';

// Board indices (3×3):
//   0 1 2
//   3 4 5
//   6 7 8

describe('pathProvesDiagonal', () => {
  it('accepts the suggested main-diagonal word (0→4→8)', () => {
    expect(pathProvesDiagonal([0, 4, 8])).toBe(true);
  });

  it('accepts any 3+ path that contains a diagonal step', () => {
    // right, right, then diagonal down-left
    expect(pathProvesDiagonal([0, 1, 2, 4])).toBe(true);
  });

  it('rejects a purely horizontal/vertical path (the misconception)', () => {
    expect(pathProvesDiagonal([0, 1, 2])).toBe(false); // straight across
    expect(pathProvesDiagonal([0, 3, 6])).toBe(false); // straight down
  });

  it('rejects paths shorter than 3 tiles', () => {
    expect(pathProvesDiagonal([0, 4])).toBe(false);
    expect(pathProvesDiagonal([])).toBe(false);
  });
});
