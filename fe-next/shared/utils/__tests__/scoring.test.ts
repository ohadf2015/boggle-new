/**
 * Tests for Canonical Scoring Utilities
 *
 * @module shared/utils/__tests__/scoring.test
 */

import {
  getComboMultiplier,
  getComboBonus,
  calculateWordScore,
  calculateWordScoreByLength,
  WORD_SCORES,
  getComboTierName,
} from '../scoring';

describe('Scoring Utilities', () => {
  describe('getComboMultiplier', () => {
    it('should return correct multipliers for all tiers', () => {
      expect(getComboMultiplier(0)).toBe(1.0);
      expect(getComboMultiplier(2)).toBe(1.0);
      expect(getComboMultiplier(3)).toBe(1.25);
      expect(getComboMultiplier(5)).toBe(1.5);
      expect(getComboMultiplier(7)).toBe(1.75);
      expect(getComboMultiplier(9)).toBe(2.0);
      expect(getComboMultiplier(11)).toBe(2.25);
      expect(getComboMultiplier(15)).toBe(2.5);
      expect(getComboMultiplier(20)).toBe(2.75);
      expect(getComboMultiplier(25)).toBe(3.0);
      expect(getComboMultiplier(100)).toBe(3.0);
      expect(getComboMultiplier(-1)).toBe(1.0);
    });
  });

  describe('getComboTierName', () => {
    it('should return correct tier names', () => {
      expect(getComboTierName(0)).toBe('none');
      expect(getComboTierName(3)).toBe('basic');
      expect(getComboTierName(5)).toBe('good');
      expect(getComboTierName(7)).toBe('great');
      expect(getComboTierName(9)).toBe('amazing');
      expect(getComboTierName(11)).toBe('legendary');
      expect(getComboTierName(15)).toBe('mythic');
      expect(getComboTierName(20)).toBe('transcendent');
      expect(getComboTierName(-1)).toBe('none');
    });
  });

  describe('getComboBonus', () => {
    it('should return 0 for combo 0 or negative', () => {
      expect(getComboBonus(0, 5)).toBe(0);
      expect(getComboBonus(-1, 5)).toBe(0);
    });

    it('should scale by word length factor', () => {
      expect(getComboBonus(5, 3)).toBe(1);
      expect(getComboBonus(5, 4)).toBe(2);
      expect(getComboBonus(5, 5)).toBe(5);
      expect(getComboBonus(5, 6)).toBe(7);
      expect(getComboBonus(5, 7)).toBe(10);
    });

    it('should scale without cap', () => {
      expect(getComboBonus(100, 5)).toBe(100);
    });

    it('should default to 4-letter word', () => {
      expect(getComboBonus(5)).toBe(2);
    });
  });

  describe('calculateWordScore', () => {
    describe('base scoring (exponential)', () => {
      it('should return 0 for single letter words', () => {
        expect(calculateWordScore('A')).toBe(0);
      });

      it('should use exponential scoring curve', () => {
        expect(calculateWordScore('AT')).toBe(5);
        expect(calculateWordScore('CAT')).toBe(10);
        expect(calculateWordScore('TREE')).toBe(20);
        expect(calculateWordScore('HOUSE')).toBe(50);
        expect(calculateWordScore('CASTLE')).toBe(100);
        expect(calculateWordScore('TESTING')).toBe(200);
        expect(calculateWordScore('ABCDEFGH')).toBe(500);
        expect(calculateWordScore('ABCDEFGHIJ')).toBe(500);
      });
    });

    describe('combo bonus', () => {
      it('should add combo bonus', () => {
        expect(calculateWordScore('HOUSE', 1)).toBe(51);
        expect(calculateWordScore('HOUSE', 5)).toBe(55);
        expect(calculateWordScore('HOUSE', 10)).toBe(60);
      });

      it('should benefit longer words more', () => {
        expect(calculateWordScore('CAT', 10)).toBe(12);
        expect(calculateWordScore('BOOK', 10)).toBe(25);
        expect(calculateWordScore('HOUSE', 10)).toBe(60);
        expect(calculateWordScore('CASTLE', 10)).toBe(115);
        expect(calculateWordScore('TESTING', 10)).toBe(220);
      });
    });

    describe('fire round multiplier', () => {
      it('should multiply the total score', () => {
        expect(calculateWordScore('CAT', 0, 2)).toBe(20);
        expect(calculateWordScore('HOUSE', 0, 2)).toBe(100);
        expect(calculateWordScore('TESTING', 0, 2)).toBe(400);
      });

      it('should apply after combo bonus', () => {
        expect(calculateWordScore('HOUSE', 5, 2)).toBe(110);
        expect(calculateWordScore('TESTING', 10, 2)).toBe(440);
      });
    });

    describe('rarity multiplier', () => {
      it('should apply rarity', () => {
        expect(calculateWordScore('CAT', 0, 1, 1.5)).toBe(15);
        expect(calculateWordScore('TEST', 0, 1, 2)).toBe(40);
      });

      it('should apply after combo and fire', () => {
        expect(calculateWordScore('HOUSE', 5, 2, 1.25)).toBe(137);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(calculateWordScore('')).toBe(0);
      });

      it('should handle negative combo', () => {
        expect(calculateWordScore('TEST', -1)).toBe(20);
      });

      it('should handle high combo (no cap)', () => {
        expect(calculateWordScore('HOUSE', 100)).toBe(150);
      });

      it('should handle zero multiplier', () => {
        expect(calculateWordScore('TEST', 0, 0)).toBe(0);
      });
    });

    describe('game flow simulation', () => {
      it('should score words with increasing combos', () => {
        expect(calculateWordScore('CAT', 0)).toBe(10);
        expect(calculateWordScore('DOG', 1)).toBe(10);
        expect(calculateWordScore('TREE', 2)).toBe(21);
        expect(calculateWordScore('HOUSE', 3)).toBe(53);
        expect(calculateWordScore('CASTLE', 4)).toBe(106);
        expect(calculateWordScore('TESTING', 5)).toBe(210);
      });
    });

    describe('exponential scaling ratios', () => {
      it('should create meaningful gaps between lengths', () => {
        expect(calculateWordScore('HOUSE') / calculateWordScore('CAT')).toBe(5);
        expect(calculateWordScore('TESTING') / calculateWordScore('CAT')).toBe(20);
        expect(calculateWordScore('ABCDEFGH') / calculateWordScore('TESTING')).toBe(2.5);
      });
    });
  });

  describe('calculateWordScoreByLength', () => {
    it('should match calculateWordScore', () => {
      expect(calculateWordScoreByLength(0)).toBe(0);
      expect(calculateWordScoreByLength(1)).toBe(0);
      expect(calculateWordScoreByLength(2)).toBe(calculateWordScore('AB'));
      expect(calculateWordScoreByLength(5)).toBe(calculateWordScore('ABCDE'));
      expect(calculateWordScoreByLength(7)).toBe(calculateWordScore('ABCDEFG'));
      expect(calculateWordScoreByLength(5, 5)).toBe(calculateWordScore('ABCDE', 5));
      expect(calculateWordScoreByLength(7, 5, 2)).toBe(calculateWordScore('ABCDEFG', 5, 2));
    });
  });

  describe('WORD_SCORES lookup table', () => {
    it('should have exponential values', () => {
      expect(WORD_SCORES[2]).toBe(5);
      expect(WORD_SCORES[3]).toBe(10);
      expect(WORD_SCORES[4]).toBe(20);
      expect(WORD_SCORES[5]).toBe(50);
      expect(WORD_SCORES[6]).toBe(100);
      expect(WORD_SCORES[7]).toBe(200);
      expect(WORD_SCORES[8]).toBe(500);
    });

    it('should match calculateWordScore', () => {
      for (let len = 2; len <= 8; len++) {
        expect(WORD_SCORES[len]).toBe(calculateWordScore('A'.repeat(len)));
      }
    });
  });
});
