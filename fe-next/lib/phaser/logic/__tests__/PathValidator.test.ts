/**
 * PathValidator — validates Boggle letter paths.
 * Pure functions, zero Phaser deps.
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import { isValidPath, getPathWord, type PathCell } from '../PathValidator';

const makeCell = (row: number, col: number, letter: string): PathCell => ({
  row,
  col,
  letter,
});

// ─── isValidPath ──────────────────────────────────────────────────────────────

describe('isValidPath', () => {
  it('returns true for a valid 3-step path', () => {
    const path: PathCell[] = [
      makeCell(0, 0, 'C'),
      makeCell(0, 1, 'A'),
      makeCell(0, 2, 'T'),
    ];
    expect(isValidPath(path)).toBe(true);
  });

  it('returns true for a diagonal path', () => {
    const path: PathCell[] = [
      makeCell(0, 0, 'D'),
      makeCell(1, 1, 'O'),
      makeCell(2, 2, 'G'),
    ];
    expect(isValidPath(path)).toBe(true);
  });

  it('returns false for an empty path', () => {
    expect(isValidPath([])).toBe(false);
  });

  it('returns false when a cell appears twice', () => {
    const path: PathCell[] = [
      makeCell(0, 0, 'A'),
      makeCell(0, 1, 'B'),
      makeCell(0, 0, 'A'), // duplicate
    ];
    expect(isValidPath(path)).toBe(false);
  });

  it('returns false when consecutive cells are not adjacent', () => {
    const path: PathCell[] = [
      makeCell(0, 0, 'A'),
      makeCell(2, 2, 'B'), // not adjacent to (0,0)
    ];
    expect(isValidPath(path)).toBe(false);
  });

  it('returns true for a mixed diagonal + straight path', () => {
    const path: PathCell[] = [
      makeCell(1, 1, 'A'),
      makeCell(0, 0, 'B'),
      makeCell(0, 1, 'C'),
    ];
    expect(isValidPath(path)).toBe(true);
  });

  it('returns true for a single cell path', () => {
    expect(isValidPath([makeCell(0, 0, 'A')])).toBe(true);
  });
});

// ─── getPathWord ──────────────────────────────────────────────────────────────

describe('getPathWord', () => {
  it('joins letters from the path in order', () => {
    const path: PathCell[] = [
      makeCell(0, 0, 'C'),
      makeCell(0, 1, 'A'),
      makeCell(0, 2, 'T'),
    ];
    expect(getPathWord(path)).toBe('CAT');
  });

  it('returns empty string for empty path', () => {
    expect(getPathWord([])).toBe('');
  });

  it('handles multi-character tile letters (e.g. "QU")', () => {
    const path: PathCell[] = [
      makeCell(0, 0, 'QU'),
      makeCell(0, 1, 'E'),
      makeCell(0, 2, 'E'),
      makeCell(0, 3, 'N'),
    ];
    expect(getPathWord(path)).toBe('QUEEN');
  });
});
