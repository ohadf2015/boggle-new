import { describe, it, expect } from 'vitest';
import { generateRandomTable, hebrewLetters } from '../gameUtils';

const HEBREW_SET = new Set(hebrewLetters);
const ENGLISH_SET = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

const cellsOf = (grid: string[][]): string[] => grid.flat();

/**
 * Regression guard for the "English player got a Hebrew board" bug.
 * Hebrew was the systemic fallback in two places (param default + else-branch),
 * so any unspecified/unknown language silently produced a Hebrew grid. Explicit
 * 'he' must keep working; everything unknown must fall back to English, never Hebrew.
 */
describe('generateRandomTable board language', () => {
  it('GIVEN explicit Hebrew WHEN generating THEN every cell is a Hebrew letter', () => {
    const grid = generateRandomTable(5, 5, 'he');
    for (const cell of cellsOf(grid)) {
      expect(HEBREW_SET.has(cell)).toBe(true);
    }
  });

  it('GIVEN explicit English WHEN generating THEN every cell is A-Z', () => {
    const grid = generateRandomTable(5, 5, 'en');
    for (const cell of cellsOf(grid)) {
      expect(ENGLISH_SET.has(cell)).toBe(true);
    }
  });

  it('GIVEN an unknown/unsupported language WHEN generating THEN falls back to English, NOT Hebrew', () => {
    const grid = generateRandomTable(5, 5, 'fr' as never);
    const cells = cellsOf(grid);
    for (const cell of cells) {
      expect(ENGLISH_SET.has(cell)).toBe(true);
    }
    expect(cells.some((c) => HEBREW_SET.has(c))).toBe(false);
  });

  it('GIVEN no language argument WHEN generating THEN defaults to English, NOT Hebrew', () => {
    const cells = cellsOf(generateRandomTable(5, 5));
    for (const cell of cells) {
      expect(ENGLISH_SET.has(cell)).toBe(true);
    }
    expect(cells.some((c) => HEBREW_SET.has(c))).toBe(false);
  });
});
