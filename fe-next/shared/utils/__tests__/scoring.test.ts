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
} from '../scoring';

describe('Scoring Utilities', () => {
  describe('getComboMultiplier', () => {
    it('should return 1.0 for combo levels 0-2', () => {
      expect(getComboMultiplier(0)).toBe(1.0);
      expect(getComboMultiplier(1)).toBe(1.0);
      expect(getComboMultiplier(2)).toBe(1.0);
    });

    it('should return 1.25 for combo levels 3-4', () => {
      expect(getComboMultiplier(3)).toBe(1.25);
      expect(getComboMultiplier(4)).toBe(1.25);
    });

    it('should return 1.5 for combo levels 5-6', () => {
      expect(getComboMultiplier(5)).toBe(1.5);
      expect(getComboMultiplier(6)).toBe(1.5);
    });

    it('should return 1.75 for combo levels 7-8', () => {
      expect(getComboMultiplier(7)).toBe(1.75);
      expect(getComboMultiplier(8)).toBe(1.75);
    });

    it('should return 2.0 for combo levels 9-10', () => {
      expect(getComboMultiplier(9)).toBe(2.0);
      expect(getComboMultiplier(10)).toBe(2.0);
    });

    it('should return 2.25 for combo levels 11+', () => {
      expect(getComboMultiplier(11)).toBe(2.25);
      expect(getComboMultiplier(15)).toBe(2.25);
      expect(getComboMultiplier(100)).toBe(2.25);
    });

    it('should handle negative combo levels gracefully', () => {
      expect(getComboMultiplier(-1)).toBe(1.0);
      expect(getComboMultiplier(-10)).toBe(1.0);
    });
  });

  describe('getComboBonus', () => {
    describe('combo level 0', () => {
      it('should return 0 for any word length when combo is 0', () => {
        expect(getComboBonus(0, 2)).toBe(0);
        expect(getComboBonus(0, 5)).toBe(0);
        expect(getComboBonus(0, 10)).toBe(0);
      });
    });

    describe('3-letter words (word length factor 0.2)', () => {
      it('should give minimal bonus for short words', () => {
        expect(getComboBonus(1, 3)).toBe(0); // floor(1 * 0.2) = 0
        expect(getComboBonus(5, 3)).toBe(1); // floor(5 * 0.2) = 1
        expect(getComboBonus(10, 3)).toBe(2); // floor(10 * 0.2) = 2
      });

      it('should handle 2-letter words same as 3-letter', () => {
        expect(getComboBonus(5, 2)).toBe(1); // floor(5 * 0.2) = 1
      });
    });

    describe('4-letter words (word length factor 0.5)', () => {
      it('should give modest bonus', () => {
        expect(getComboBonus(1, 4)).toBe(0); // floor(1 * 0.5) = 0
        expect(getComboBonus(2, 4)).toBe(1); // floor(2 * 0.5) = 1
        expect(getComboBonus(5, 4)).toBe(2); // floor(5 * 0.5) = 2
        expect(getComboBonus(10, 4)).toBe(5); // floor(10 * 0.5) = 5
      });
    });

    describe('5-letter words (word length factor 1.0)', () => {
      it('should give full base bonus', () => {
        expect(getComboBonus(1, 5)).toBe(1); // floor(1 * 1.0) = 1
        expect(getComboBonus(5, 5)).toBe(5); // floor(5 * 1.0) = 5
        expect(getComboBonus(10, 5)).toBe(10); // floor(10 * 1.0) = 10
      });
    });

    describe('6-letter words (word length factor 1.5)', () => {
      it('should give 1.5x bonus', () => {
        expect(getComboBonus(2, 6)).toBe(3); // floor(2 * 1.5) = 3
        expect(getComboBonus(5, 6)).toBe(7); // floor(5 * 1.5) = 7
        expect(getComboBonus(10, 6)).toBe(15); // floor(10 * 1.5) = 15
      });
    });

    describe('7+ letter words (word length factor 2.0)', () => {
      it('should give 2x bonus for long words', () => {
        expect(getComboBonus(1, 7)).toBe(2); // floor(1 * 2.0) = 2
        expect(getComboBonus(5, 7)).toBe(10); // floor(5 * 2.0) = 10
        expect(getComboBonus(10, 7)).toBe(20); // floor(10 * 2.0) = 20
        expect(getComboBonus(5, 10)).toBe(10); // floor(5 * 2.0) = 10
      });
    });

    describe('combo cap at 10', () => {
      it('should cap base bonus at 10 even for high combos', () => {
        expect(getComboBonus(15, 5)).toBe(10); // floor(10 * 1.0) = 10, not 15
        expect(getComboBonus(20, 5)).toBe(10); // floor(10 * 1.0) = 10, not 20
        expect(getComboBonus(100, 5)).toBe(10); // floor(10 * 1.0) = 10, not 100
      });
    });

    describe('default word length', () => {
      it('should default to 4-letter word if not specified', () => {
        expect(getComboBonus(5)).toBe(2); // floor(5 * 0.5) = 2 (4-letter default)
      });
    });

    describe('negative combo levels', () => {
      it('should return 0 for negative combos', () => {
        expect(getComboBonus(-1, 5)).toBe(0);
        expect(getComboBonus(-10, 7)).toBe(0);
      });
    });
  });

  describe('calculateWordScore', () => {
    describe('base scoring (no combos, no fire round)', () => {
      it('should return 0 for single letter words', () => {
        expect(calculateWordScore('A')).toBe(0);
        expect(calculateWordScore('X')).toBe(0);
      });

      it('should score 2-letter words as 1 point', () => {
        expect(calculateWordScore('AT')).toBe(1); // 2 - 1 = 1
        expect(calculateWordScore('BE')).toBe(1);
      });

      it('should score 3-letter words as 2 points', () => {
        expect(calculateWordScore('CAT')).toBe(2); // 3 - 1 = 2
        expect(calculateWordScore('DOG')).toBe(2);
      });

      it('should score 4-letter words as 3 points', () => {
        expect(calculateWordScore('TREE')).toBe(3); // 4 - 1 = 3
        expect(calculateWordScore('BOOK')).toBe(3);
      });

      it('should score 5-letter words as 4 points', () => {
        expect(calculateWordScore('HOUSE')).toBe(4); // 5 - 1 = 4
      });

      it('should score 6-letter words as 5 points', () => {
        expect(calculateWordScore('CASTLE')).toBe(5); // 6 - 1 = 5
      });

      it('should score 7-letter words as 6 points', () => {
        expect(calculateWordScore('TESTING')).toBe(6); // 7 - 1 = 6
      });

      it('should score very long words correctly', () => {
        expect(calculateWordScore('ABCDEFGHIJ')).toBe(9); // 10 - 1 = 9
        expect(calculateWordScore('ABCDEFGHIJKLMNO')).toBe(14); // 15 - 1 = 14
      });
    });

    describe('combo bonus scoring', () => {
      it('should add combo bonus for combo level 1+', () => {
        expect(calculateWordScore('HOUSE', 1)).toBe(5); // base 4 + combo 1 = 5
        expect(calculateWordScore('HOUSE', 5)).toBe(9); // base 4 + combo 5 = 9
      });

      it('should benefit longer words more from combos', () => {
        const combo5Short = calculateWordScore('CAT', 5); // 3-letter
        const combo5Medium = calculateWordScore('HOUSE', 5); // 5-letter
        const combo5Long = calculateWordScore('TESTING', 5); // 7-letter

        expect(combo5Long).toBeGreaterThan(combo5Medium);
        expect(combo5Medium).toBeGreaterThan(combo5Short);
      });

      it('should calculate correct scores with combo level 10', () => {
        expect(calculateWordScore('CAT', 10)).toBe(4); // base 2 + combo 2 = 4
        expect(calculateWordScore('BOOK', 10)).toBe(8); // base 3 + combo 5 = 8
        expect(calculateWordScore('HOUSE', 10)).toBe(14); // base 4 + combo 10 = 14
        expect(calculateWordScore('CASTLE', 10)).toBe(20); // base 5 + combo 15 = 20
        expect(calculateWordScore('TESTING', 10)).toBe(26); // base 6 + combo 20 = 26
      });
    });

    describe('fire round multiplier', () => {
      it('should double the score during fire rounds', () => {
        expect(calculateWordScore('CAT', 0, 2)).toBe(4); // (2 + 0) * 2 = 4
        expect(calculateWordScore('HOUSE', 0, 2)).toBe(8); // (4 + 0) * 2 = 8
        expect(calculateWordScore('TESTING', 0, 2)).toBe(12); // (6 + 0) * 2 = 12
      });

      it('should apply fire multiplier after combo bonus', () => {
        expect(calculateWordScore('HOUSE', 5, 2)).toBe(18); // (4 + 5) * 2 = 18
        expect(calculateWordScore('TESTING', 10, 2)).toBe(52); // (6 + 20) * 2 = 52
      });

      it('should work with 1x multiplier (no fire)', () => {
        expect(calculateWordScore('CAT', 0, 1)).toBe(2);
        expect(calculateWordScore('CAT', 5, 1)).toBe(3);
      });

      it('should handle custom multipliers', () => {
        expect(calculateWordScore('CAT', 0, 3)).toBe(6); // (2 + 0) * 3 = 6
        expect(calculateWordScore('CAT', 0, 1.5)).toBe(3); // (2 + 0) * 1.5 = 3
      });
    });

    describe('complex scenarios', () => {
      it('should calculate maximum possible score correctly', () => {
        // Long word (10 letters) + max combo (10) + fire round (2x)
        const maxScore = calculateWordScore('ABCDEFGHIJ', 10, 2);
        // base = 9, combo = 20 (10 * 2.0), fire = 2x
        // (9 + 20) * 2 = 58
        expect(maxScore).toBe(58);
      });

      it('should handle default parameters correctly', () => {
        expect(calculateWordScore('TEST')).toBe(3); // combo 0, fire 1
        expect(calculateWordScore('TEST', 5)).toBe(5); // fire 1
      });

      it('should handle zero combo with fire round', () => {
        expect(calculateWordScore('TEST', 0, 2)).toBe(6); // (3 + 0) * 2 = 6
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings gracefully', () => {
        expect(calculateWordScore('')).toBe(0);
      });

      it('should handle negative combo levels', () => {
        expect(calculateWordScore('TEST', -1)).toBe(3); // treats as combo 0
        expect(calculateWordScore('TEST', -5)).toBe(3);
      });

      it('should handle very high combo levels (capped at 10)', () => {
        expect(calculateWordScore('HOUSE', 100)).toBe(14); // base 4 + combo 10 (capped) = 14
      });

      it('should handle zero multiplier', () => {
        expect(calculateWordScore('TEST', 0, 0)).toBe(0);
        expect(calculateWordScore('TEST', 5, 0)).toBe(0);
      });
    });

    describe('real game scenarios', () => {
      it('should score typical beginner game words', () => {
        expect(calculateWordScore('THE')).toBe(2);
        expect(calculateWordScore('AND')).toBe(2);
        expect(calculateWordScore('CAT')).toBe(2);
      });

      it('should score typical intermediate game words', () => {
        expect(calculateWordScore('HOUSE')).toBe(4);
        expect(calculateWordScore('QUICK')).toBe(4);
        expect(calculateWordScore('BROWN')).toBe(4);
      });

      it('should score typical advanced game words', () => {
        expect(calculateWordScore('TESTING')).toBe(6);
        expect(calculateWordScore('QUALITY')).toBe(6);
        expect(calculateWordScore('EXAMPLE')).toBe(6);
      });

      it('should score words with combos in a typical game flow', () => {
        // Simulate a game flow with increasing combo
        expect(calculateWordScore('CAT', 0)).toBe(2); // First word
        expect(calculateWordScore('DOG', 1)).toBe(2); // Combo 1
        expect(calculateWordScore('TREE', 2)).toBe(4); // Combo 2 (base 3 + bonus 1)
        expect(calculateWordScore('HOUSE', 3)).toBe(7); // Combo 3 (base 4 + bonus 3)
        expect(calculateWordScore('CASTLE', 4)).toBe(11); // Combo 4 (base 5 + bonus 6)
        expect(calculateWordScore('TESTING', 5)).toBe(16); // Combo 5
      });
    });
  });

  describe('calculateWordScoreByLength', () => {
    it('should return 0 for single letter', () => {
      expect(calculateWordScoreByLength(1)).toBe(0);
    });

    it('should return 0 for zero or negative lengths', () => {
      expect(calculateWordScoreByLength(0)).toBe(0);
      expect(calculateWordScoreByLength(-1)).toBe(0);
      expect(calculateWordScoreByLength(-5)).toBe(0);
    });

    it('should match calculateWordScore for same lengths', () => {
      expect(calculateWordScoreByLength(2)).toBe(calculateWordScore('AB'));
      expect(calculateWordScoreByLength(3)).toBe(calculateWordScore('ABC'));
      expect(calculateWordScoreByLength(5)).toBe(calculateWordScore('ABCDE'));
      expect(calculateWordScoreByLength(7)).toBe(calculateWordScore('ABCDEFG'));
    });

    it('should work with combo levels', () => {
      expect(calculateWordScoreByLength(5, 5)).toBe(calculateWordScore('ABCDE', 5));
      expect(calculateWordScoreByLength(7, 10)).toBe(calculateWordScore('ABCDEFG', 10));
    });

    it('should work with fire round multiplier', () => {
      expect(calculateWordScoreByLength(5, 0, 2)).toBe(calculateWordScore('ABCDE', 0, 2));
      expect(calculateWordScoreByLength(7, 5, 2)).toBe(calculateWordScore('ABCDEFG', 5, 2));
    });

    it('should handle all parameters', () => {
      expect(calculateWordScoreByLength(6, 5, 2)).toBe(calculateWordScore('ABCDEF', 5, 2));
    });
  });

  describe('WORD_SCORES lookup table', () => {
    it('should have correct values for 2-8 letter words', () => {
      expect(WORD_SCORES[2]).toBe(1);
      expect(WORD_SCORES[3]).toBe(2);
      expect(WORD_SCORES[4]).toBe(3);
      expect(WORD_SCORES[5]).toBe(4);
      expect(WORD_SCORES[6]).toBe(5);
      expect(WORD_SCORES[7]).toBe(6);
      expect(WORD_SCORES[8]).toBe(7);
    });

    it('should match calculateWordScore base scores', () => {
      expect(WORD_SCORES[2]).toBe(calculateWordScore('AB'));
      expect(WORD_SCORES[3]).toBe(calculateWordScore('ABC'));
      expect(WORD_SCORES[4]).toBe(calculateWordScore('ABCD'));
      expect(WORD_SCORES[5]).toBe(calculateWordScore('ABCDE'));
      expect(WORD_SCORES[6]).toBe(calculateWordScore('ABCDEF'));
      expect(WORD_SCORES[7]).toBe(calculateWordScore('ABCDEFG'));
      expect(WORD_SCORES[8]).toBe(calculateWordScore('ABCDEFGH'));
    });
  });

  describe('backward compatibility', () => {
    it('should produce same results as old scoringEngine implementation', () => {
      // These test cases verify compatibility with the original scoringEngine.ts
      expect(calculateWordScore('AB', 0, 1)).toBe(1);
      expect(calculateWordScore('CAT', 0, 1)).toBe(2);
      expect(calculateWordScore('TEST', 0, 1)).toBe(3);
      expect(calculateWordScore('HOUSE', 0, 1)).toBe(4);
      expect(calculateWordScore('CASTLE', 0, 1)).toBe(5);
      expect(calculateWordScore('TESTING', 0, 1)).toBe(6);
    });

    it('should handle combo bonuses same as scoringEngine', () => {
      // Verify combo bonus calculations match original
      expect(calculateWordScore('HOUSE', 5, 1)).toBe(9); // base 4 + combo 5
      expect(calculateWordScore('TESTING', 10, 1)).toBe(26); // base 6 + combo 20
    });

    it('should handle fire rounds same as scoringEngine', () => {
      // Verify fire round multiplier matches original
      expect(calculateWordScore('HOUSE', 0, 2)).toBe(8); // (4 + 0) * 2
      expect(calculateWordScore('HOUSE', 5, 2)).toBe(18); // (4 + 5) * 2
    });
  });
});
