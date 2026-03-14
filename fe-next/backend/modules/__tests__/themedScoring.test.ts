/**
 * Themed Scoring Tests
 * TDD: Tests written before implementation
 */

import {
  THEMED_MULTIPLIER,
  isThemedWord,
  calculateThemedBonus,
  getThemedWordsFound,
  getThemedSummary,
} from '../themedScoring';

describe('themedScoring', () => {
  const packWords = new Set(['OCEAN', 'WAVE', 'SURF', 'TIDE', 'CORAL']);

  describe('THEMED_MULTIPLIER', () => {
    it('returns 2', () => {
      expect(THEMED_MULTIPLIER).toBe(2);
    });
  });

  describe('isThemedWord', () => {
    it('returns true if word is in pack set (exact match)', () => {
      expect(isThemedWord('OCEAN', packWords)).toBe(true);
    });

    it('returns true for lowercase input when pack stores uppercase', () => {
      expect(isThemedWord('ocean', packWords)).toBe(true);
    });

    it('returns false if word is not in pack', () => {
      expect(isThemedWord('MOUNTAIN', packWords)).toBe(false);
    });

    it('returns false for empty pack', () => {
      expect(isThemedWord('OCEAN', new Set())).toBe(false);
    });
  });

  describe('calculateThemedBonus', () => {
    it('returns baseScore * THEMED_MULTIPLIER for themed words', () => {
      expect(calculateThemedBonus(10, 'OCEAN', packWords)).toBe(20);
    });

    it('returns baseScore unchanged for non-themed words', () => {
      expect(calculateThemedBonus(10, 'MOUNTAIN', packWords)).toBe(10);
    });

    it('returns baseScore unchanged when packWords is null', () => {
      expect(calculateThemedBonus(10, 'OCEAN', null)).toBe(10);
    });

    it('handles lowercase word input', () => {
      expect(calculateThemedBonus(5, 'wave', packWords)).toBe(10);
    });
  });

  describe('getThemedWordsFound', () => {
    it('returns count of player words that are in pack', () => {
      const playerWords = ['ocean', 'mountain', 'wave', 'valley'];
      expect(getThemedWordsFound(playerWords, packWords)).toBe(2);
    });

    it('returns 0 when no player words match pack', () => {
      expect(getThemedWordsFound(['mountain', 'valley'], packWords)).toBe(0);
    });

    it('returns 0 for empty player words', () => {
      expect(getThemedWordsFound([], packWords)).toBe(0);
    });
  });

  describe('getThemedSummary', () => {
    it('returns found count, total, and matching words', () => {
      const playerWords = ['ocean', 'mountain', 'wave'];
      const result = getThemedSummary(playerWords, packWords);
      expect(result.found).toBe(2);
      expect(result.total).toBe(packWords.size);
      expect(result.words).toHaveLength(2);
    });

    it('returns found=0 when no matches', () => {
      const result = getThemedSummary(['cat', 'dog'], packWords);
      expect(result.found).toBe(0);
      expect(result.total).toBe(packWords.size);
      expect(result.words).toEqual([]);
    });

    it('returns all player words that are themed', () => {
      const playerWords = ['coral', 'tide', 'surf'];
      const result = getThemedSummary(playerWords, packWords);
      expect(result.found).toBe(3);
      expect(result.words.sort()).toEqual(['coral', 'surf', 'tide'].sort());
    });
  });
});
