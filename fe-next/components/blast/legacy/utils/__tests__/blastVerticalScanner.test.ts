/**
 * blastVerticalScanner - TDD tests for vertical word detection in blast mode.
 *
 * Detects valid vertical words (3+ letters) formed by settled grid columns
 * after cascade (gravity + refill). Used for Candy Crush-style chain reactions.
 */

import { detectVerticalWords, type VerticalWord } from '../blastVerticalScanner';
import type { BlastTileState } from '../../types';

// Helper: create a grid from a 2D array of letters
function makeGrid(letters: string[][]): string[][] {
  return letters;
}

// Helper: create tile states from a grid (all standard, not cleared)
function makeTileStates(grid: string[][]): BlastTileState[][] {
  return grid.map((row, ri) =>
    row.map((_, ci) => ({
      row: ri,
      col: ci,
      type: 'standard' as const,
      isCleared: false,
      activationEffect: null,
      hitsRemaining: 0,
    }))
  );
}

// Helper: create tile states with some cells cleared
function makeTileStatesWithCleared(
  grid: string[][],
  clearedCells: Array<{ row: number; col: number }>
): BlastTileState[][] {
  const states = makeTileStates(grid);
  for (const { row, col } of clearedCells) {
    states[row][col].isCleared = true;
  }
  return states;
}

describe('blastVerticalScanner', () => {
  describe('detectVerticalWords', () => {
    it('should detect a simple 3-letter vertical word', () => {
      // Column 0: C-A-T (top to bottom)
      const grid = makeGrid([
        ['C', 'X', 'Y'],
        ['A', 'X', 'Y'],
        ['T', 'X', 'Y'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => w === 'cat';

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('cat');
      expect(result[0].column).toBe(0);
      expect(result[0].startRow).toBe(0);
      expect(result[0].endRow).toBe(2);
    });

    it('should ignore 2-letter sequences (under minLength)', () => {
      const grid = makeGrid([
        ['A', 'X'],
        ['T', 'X'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => w === 'at';

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set(), 3);

      expect(result).toHaveLength(0);
    });

    it('should skip words already in foundWords', () => {
      const grid = makeGrid([
        ['C', 'X'],
        ['A', 'X'],
        ['T', 'X'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => w === 'cat';
      const foundWords = new Set(['cat']);

      const result = detectVerticalWords(grid, tileStates, checkWord, foundWords);

      expect(result).toHaveLength(0);
    });

    it('should detect words in multiple columns simultaneously', () => {
      // Col 0: C-A-T, Col 2: D-O-G
      const grid = makeGrid([
        ['C', 'X', 'D'],
        ['A', 'X', 'O'],
        ['T', 'X', 'G'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => ['cat', 'dog'].includes(w);

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(2);
      const words = result.map(r => r.word).sort();
      expect(words).toEqual(['cat', 'dog']);
    });

    it('should prefer longest word in overlapping spans', () => {
      // Column 0: C-A-T-S — "cats" (4 letters) should win over "cat" (3)
      const grid = makeGrid([
        ['C', 'X'],
        ['A', 'X'],
        ['T', 'X'],
        ['S', 'X'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => ['cats', 'cat'].includes(w);

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('cats');
      expect(result[0].startRow).toBe(0);
      expect(result[0].endRow).toBe(3);
    });

    it('should break column runs at cleared cells', () => {
      // Column 0: C, [cleared], T — run breaks at row 1
      const grid = makeGrid([
        ['C', 'X'],
        ['A', 'X'],
        ['T', 'X'],
      ]);
      const tileStates = makeTileStatesWithCleared(grid, [{ row: 1, col: 0 }]);
      const checkWord = (w: string) => w === 'cat';

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no valid words exist', () => {
      const grid = makeGrid([
        ['X', 'Y'],
        ['Z', 'W'],
        ['Q', 'J'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = () => false;

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(0);
    });

    it('should detect a full-column word (6 letters)', () => {
      const grid = makeGrid([
        ['S', 'X'],
        ['P', 'X'],
        ['R', 'X'],
        ['I', 'X'],
        ['N', 'X'],
        ['G', 'X'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => w === 'spring';

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('spring');
      expect(result[0].startRow).toBe(0);
      expect(result[0].endRow).toBe(5);
    });

    it('should detect two non-overlapping words in the same column', () => {
      // Column 0: C-A-T-X-D-O-G (7 rows) — "cat" at 0-2, "dog" at 4-6
      const grid = makeGrid([
        ['C', 'Y'],
        ['A', 'Y'],
        ['T', 'Y'],
        ['X', 'Y'],
        ['D', 'Y'],
        ['O', 'Y'],
        ['G', 'Y'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => ['cat', 'dog'].includes(w);

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      // Should find both words in column 0
      const col0Words = result.filter(r => r.column === 0);
      expect(col0Words).toHaveLength(2);
      const words = col0Words.map(r => r.word).sort();
      expect(words).toEqual(['cat', 'dog']);
    });

    it('should return empty array for empty grid', () => {
      const result = detectVerticalWords([], [], () => true, new Set());
      expect(result).toHaveLength(0);
    });

    it('should only scan affectedColumns when provided', () => {
      // Col 0: C-A-T, Col 2: D-O-G — but only col 2 is affected
      const grid = makeGrid([
        ['C', 'X', 'D'],
        ['A', 'X', 'O'],
        ['T', 'X', 'G'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => ['cat', 'dog'].includes(w);

      const result = detectVerticalWords(
        grid, tileStates, checkWord, new Set(), 3, new Set([2])
      );

      // Should only find "dog" in col 2, not "cat" in col 0
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('dog');
      expect(result[0].column).toBe(2);
    });

    it('should scan all columns when affectedColumns is undefined', () => {
      const grid = makeGrid([
        ['C', 'D'],
        ['A', 'O'],
        ['T', 'G'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => ['cat', 'dog'].includes(w);

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set(), 3, undefined);

      expect(result).toHaveLength(2);
    });

    it('should return correct path coordinates', () => {
      const grid = makeGrid([
        ['X', 'D'],
        ['X', 'O'],
        ['X', 'G'],
      ]);
      const tileStates = makeTileStates(grid);
      const checkWord = (w: string) => w === 'dog';

      const result = detectVerticalWords(grid, tileStates, checkWord, new Set());

      expect(result).toHaveLength(1);
      expect(result[0].path).toEqual([
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 2, col: 1 },
      ]);
    });
  });
});
