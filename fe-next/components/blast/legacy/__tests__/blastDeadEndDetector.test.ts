/**
 * blastDeadEndDetector - Tests for dead-end detection utility
 *
 * Tests the pure function that checks if any valid words remain
 * on the grid after tiles are cleared and gravity cascades settle.
 */

import { hasValidWords, findHintPath } from '../utils/blastDeadEndDetector';

describe('hasValidWords', () => {
  // Mock dictionary: only these words are valid
  const dictionary = new Set(['at', 'cat', 'bat', 'tab', 'cab', 'act', 'ab']);
  const checkWord = (word: string) => dictionary.has(word.toLowerCase());

  describe('basic detection', () => {
    it('should find valid words on a simple grid', () => {
      const grid = [
        ['C', 'A'],
        ['T', 'B'],
      ];

      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(true);
    });

    it('should return false when no valid words exist', () => {
      const grid = [
        ['X', 'Z'],
        ['Q', 'J'],
      ];

      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(false);
    });
  });

  describe('cleared cells', () => {
    it('should skip cleared cells (empty strings)', () => {
      // Grid where only non-adjacent letters remain (no path possible)
      const grid = [
        ['C', '', 'T'],
        ['', '', ''],
        ['A', '', 'B'],
      ];

      // C is at (0,0), A is at (2,0) — they ARE adjacent diagonally
      // "CA" or "AC" — not in dictionary. But C(0,0) and A(2,0) are not adjacent (distance 2)
      // Actually (0,0) and (2,0) are NOT adjacent. Adjacent means within 1 step.
      // So no valid path exists.
      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(false);
    });

    it('should find words around cleared cells', () => {
      const grid = [
        ['C', 'A', 'T'],
        ['', '', ''],
        ['X', 'X', 'X'],
      ];

      // C-A-T is a valid path on row 0
      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(true);
    });
  });

  describe('already found words', () => {
    it('should skip words already found by player', () => {
      const grid = [
        ['A', 'T'],
        ['X', 'X'],
      ];

      // "at" is the only valid word, but it's already found
      const foundWords = new Set(['at']);
      const result = hasValidWords(grid, 'en', checkWord, foundWords);
      expect(result).toBe(false);
    });

    it('should find other words even when some are already found', () => {
      const grid = [
        ['C', 'A'],
        ['T', 'B'],
      ];

      // "at" is found, but "cat", "cab", "bat", "tab", "ab" still exist
      const foundWords = new Set(['at']);
      const result = hasValidWords(grid, 'en', checkWord, foundWords);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty grid', () => {
      const grid: string[][] = [];
      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(false);
    });

    it('should handle fully cleared grid', () => {
      const grid = [
        ['', ''],
        ['', ''],
      ];
      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(false);
    });

    it('should handle single remaining cell (too short for any word)', () => {
      const grid = [
        ['A', ''],
        ['', ''],
      ];
      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(false);
    });

    it('should respect minLength parameter', () => {
      const grid = [
        ['A', 'T'],
        ['X', 'X'],
      ];

      // "at" is valid with minLength 2
      expect(hasValidWords(grid, 'en', checkWord, new Set(), 2)).toBe(true);
      // But not with minLength 3
      expect(hasValidWords(grid, 'en', checkWord, new Set(), 3)).toBe(false);
    });
  });

  describe('path validity', () => {
    it('should only use adjacent cells (8-directional)', () => {
      // A and T are not adjacent — gap in between
      const grid = [
        ['A', '', 'T'],
      ];

      const result = hasValidWords(grid, 'en', checkWord, new Set());
      expect(result).toBe(false);
    });

    it('should not reuse cells in the same path', () => {
      // Single 'A' cell — can't form "aa" even if it were a word
      const grid = [['A']];
      const dictWithAA = new Set(['aa']);
      const check = (w: string) => dictWithAA.has(w.toLowerCase());

      const result = hasValidWords(grid, 'en', check, new Set());
      expect(result).toBe(false);
    });
  });
});

describe('findHintPath', () => {
  const grid = [
    ['c', 'a', 't'],
    ['o', 'g', 'd'],
    ['d', 'e', 'f'],
  ];
  const checkWord = (w: string) => ['cat', 'dog', 'god', 'cog', 'age'].includes(w);
  const foundWords = new Set<string>();

  it('returns a valid word path', () => {
    const result = findHintPath(grid, 'en', checkWord, foundWords, 3, 6);
    expect(result).not.toBeNull();
    expect(result!.word.length).toBeGreaterThanOrEqual(3);
    expect(result!.path.length).toBe(result!.word.length);
    expect(checkWord(result!.word)).toBe(true);
  });

  it('returns null when no valid words exist', () => {
    const emptyGrid = [['', '', ''], ['', '', ''], ['', '', '']];
    const result = findHintPath(emptyGrid, 'en', checkWord, foundWords, 3, 6);
    expect(result).toBeNull();
  });

  it('skips already found words', () => {
    const allFound = new Set(['cat', 'dog', 'god', 'cog', 'age']);
    const result = findHintPath(grid, 'en', checkWord, allFound, 3, 6);
    expect(result).toBeNull();
  });

  it('returns path with valid grid coordinates', () => {
    const result = findHintPath(grid, 'en', checkWord, foundWords, 3, 6);
    if (result) {
      for (const { row, col } of result.path) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(grid.length);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(grid[0].length);
      }
    }
  });
});
