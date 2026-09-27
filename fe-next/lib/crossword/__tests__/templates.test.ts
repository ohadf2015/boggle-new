import { describe, it, expect } from 'vitest';
import { isRealCrossword } from '../templates';

/**
 * 5×5 with the four corners blocked. Every white cell sits in both an across and a down run,
 * lengths vary (3 and 5), and there is at least one block — so this is a structurally valid
 * crossword whatever the letters are (the gate is structural, not lexical).
 */
function cornersGrid(rows: string[]): (string | null)[][] {
  return rows.map((r) => r.split('').map((ch) => (ch === '#' ? null : ch)));
}

const VALID = cornersGrid([
  '#abc#',
  'defgh',
  'ijklm',
  'nopqr',
  '#stu#',
]);

describe('isRealCrossword', () => {
  it('accepts a doubly-checked grid with varied run lengths', () => {
    expect(isRealCrossword(VALID, false)).toBe(true);
  });

  it('rejects a grid where an across answer repeats a down answer', () => {
    // col1 reads "aejos"; make row1 read the same.
    const grid = cornersGrid([
      '#abc#',
      'aejos',
      'ijklm',
      'nopqr',
      '#stu#',
    ]);
    expect(isRealCrossword(grid, false)).toBe(false);
  });

  it('rejects a grid where two across answers are identical', () => {
    // Duplicate answers within one direction are the most visible quality defect at
    // newspaper scale, where 40+ slots are filled from one bank.
    const grid = cornersGrid([
      '#abc#',
      'defgh',
      'ijklm',
      'nopqr',
      '#abc#',
    ]);
    expect(isRealCrossword(grid, false)).toBe(false);
  });

  it('rejects a grid where two down answers are identical', () => {
    // col0 reads "din" and col4 reads "hmr"; make col4 read "din" too.
    const grid = cornersGrid([
      '#abc#',
      'defgd',
      'ijkli',
      'nopqn',
      '#stu#',
    ]);
    expect(isRealCrossword(grid, false)).toBe(false);
  });

  it('rejects a grid with no block', () => {
    expect(isRealCrossword(cornersGrid(['abcde', 'fghij', 'klmno', 'pqrst', 'uvwxy']), false)).toBe(
      false,
    );
  });
});
