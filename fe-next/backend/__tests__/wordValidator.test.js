/**
 * Word Validator Tests
 * Tests for board word validation logic
 */

const {
  validateWordOnBoard,
  getWordPath,
  makePositionsMap,
  normalizeHebrewLetter,
  normalizeHebrewWord
} = require('../modules/wordValidator');

describe('Word Validator', () => {

  // Sample 3x3 board for testing
  const testBoard = [
    ['C', 'A', 'T'],
    ['D', 'O', 'G'],
    ['R', 'A', 'T']
  ];

  // Sample 4x4 board with more words
  const largerBoard = [
    ['H', 'E', 'L', 'P'],
    ['A', 'L', 'L', 'O'],
    ['R', 'I', 'S', 'E'],
    ['D', 'O', 'N', 'E']
  ];

  describe('validateWordOnBoard', () => {

    test('finds simple horizontal word', () => {
      expect(validateWordOnBoard('cat', testBoard)).toBe(true);
    });

    test('finds simple vertical word', () => {
      expect(validateWordOnBoard('cdr', testBoard)).toBe(true);
    });

    test('finds diagonal word', () => {
      expect(validateWordOnBoard('cot', testBoard)).toBe(true);
    });

    test('finds word that wraps around', () => {
      expect(validateWordOnBoard('dog', testBoard)).toBe(true);
    });

    test('rejects word not on board', () => {
      expect(validateWordOnBoard('xyz', testBoard)).toBe(false);
    });

    test('rejects word that reuses same cell', () => {
      // "TAAT" would need to reuse 'A' at position (0,1)
      expect(validateWordOnBoard('tat', testBoard)).toBe(false);
    });

    test('case insensitive matching', () => {
      expect(validateWordOnBoard('CAT', testBoard)).toBe(true);
      expect(validateWordOnBoard('Cat', testBoard)).toBe(true);
    });

    test('handles empty word', () => {
      expect(validateWordOnBoard('', testBoard)).toBe(false);
    });

    test('handles null/undefined board', () => {
      expect(validateWordOnBoard('cat', null)).toBe(false);
      expect(validateWordOnBoard('cat', undefined)).toBe(false);
    });

    test('handles empty board', () => {
      expect(validateWordOnBoard('cat', [])).toBe(false);
    });

    test('finds longer word on larger board', () => {
      expect(validateWordOnBoard('hello', largerBoard)).toBe(true);
    });

    test('finds word using all directions', () => {
      expect(validateWordOnBoard('rise', largerBoard)).toBe(true);
    });

  });

  describe('getWordPath', () => {

    test('returns correct path for horizontal word', () => {
      const path = getWordPath('cat', testBoard);
      expect(path).not.toBeNull();
      expect(path.length).toBe(3);
      expect(path[0]).toEqual({ row: 0, col: 0 }); // C
      expect(path[1]).toEqual({ row: 0, col: 1 }); // A
      expect(path[2]).toEqual({ row: 0, col: 2 }); // T
    });

    test('returns null for word not on board', () => {
      const path = getWordPath('xyz', testBoard);
      expect(path).toBeNull();
    });

    test('path uses each cell only once', () => {
      const path = getWordPath('dog', testBoard);
      expect(path).not.toBeNull();

      // Check all cells are unique
      const cellKeys = path.map(p => `${p.row},${p.col}`);
      const uniqueKeys = new Set(cellKeys);
      expect(uniqueKeys.size).toBe(cellKeys.length);
    });

  });

  describe('makePositionsMap', () => {

    test('creates map of letter positions', () => {
      const positions = makePositionsMap(testBoard);

      expect(positions.get('c')).toEqual([[0, 0]]);
      expect(positions.get('a')).toEqual([[0, 1], [2, 1]]); // Two 'A's
      expect(positions.get('t')).toEqual([[0, 2], [2, 2]]); // Two 'T's
    });

    test('handles empty board', () => {
      const positions = makePositionsMap([]);
      expect(positions.size).toBe(0);
    });

    test('lowercases all letters', () => {
      const positions = makePositionsMap([['A', 'B'], ['C', 'D']]);
      expect(positions.has('a')).toBe(true);
      expect(positions.has('A')).toBe(false);
    });

  });

  describe('Hebrew normalization', () => {

    test('normalizes final form letters', () => {
      expect(normalizeHebrewLetter('ץ')).toBe('צ');
      expect(normalizeHebrewLetter('ך')).toBe('כ');
      expect(normalizeHebrewLetter('ם')).toBe('מ');
      expect(normalizeHebrewLetter('ן')).toBe('נ');
      expect(normalizeHebrewLetter('ף')).toBe('פ');
    });

    test('keeps regular Hebrew letters unchanged', () => {
      expect(normalizeHebrewLetter('א')).toBe('א');
      expect(normalizeHebrewLetter('ב')).toBe('ב');
      expect(normalizeHebrewLetter('צ')).toBe('צ');
    });

    test('keeps English letters unchanged', () => {
      expect(normalizeHebrewLetter('a')).toBe('a');
      expect(normalizeHebrewLetter('Z')).toBe('Z');
    });

    test('normalizes entire Hebrew word', () => {
      // Final ם (mem sofit) gets normalized to מ (regular mem)
      expect(normalizeHebrewWord('שלום')).toBe('שלומ');
      expect(normalizeHebrewWord('ילדים')).toBe('ילדימ'); // Final מ becomes מ
    });

  });

  describe('Edge Cases', () => {

    test('single letter word', () => {
      expect(validateWordOnBoard('c', testBoard)).toBe(true);
      const path = getWordPath('c', testBoard);
      expect(path).toEqual([{ row: 0, col: 0 }]);
    });

    test('entire board as path', () => {
      // Create a small board where we can use all cells
      const smallBoard = [['A', 'B'], ['C', 'D']];
      // Path: A -> B -> D -> C (or other valid paths)
      expect(validateWordOnBoard('abdc', smallBoard)).toBe(true);
    });

    test('very long word (longer than board)', () => {
      const longWord = 'abcdefghijklmnop';
      expect(validateWordOnBoard(longWord, testBoard)).toBe(false);
    });

    test('word with repeated letter that exists multiple times', () => {
      // Board has two 'A's, so 'AA' might be possible if adjacent
      // In testBoard, A's are at (0,1) and (2,1) - not adjacent
      expect(validateWordOnBoard('aa', testBoard)).toBe(false);

      // Create a board where 'AA' is possible
      const aaBoard = [['A', 'A', 'B']];
      expect(validateWordOnBoard('aa', aaBoard)).toBe(true);
    });

  });

});
