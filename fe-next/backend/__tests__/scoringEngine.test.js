/**
 * Scoring Engine Tests
 * Tests for word scoring and combo calculations
 */

const { calculateWordScore, getComboBonus, getComboMultiplier } = require('../modules/scoringEngine');

describe('Scoring Engine', () => {

  describe('calculateWordScore', () => {

    describe('base scoring (no combo)', () => {
      test('single letter word returns 0', () => {
        expect(calculateWordScore('a')).toBe(0);
      });

      test('2-letter word returns 1 point', () => {
        expect(calculateWordScore('at')).toBe(1);
      });

      test('3-letter word returns 2 points', () => {
        expect(calculateWordScore('cat')).toBe(2);
      });

      test('4-letter word returns 3 points', () => {
        expect(calculateWordScore('word')).toBe(3);
      });

      test('5-letter word returns 4 points', () => {
        expect(calculateWordScore('hello')).toBe(4);
      });

      test('7-letter word returns 6 points', () => {
        expect(calculateWordScore('testing')).toBe(6);
      });

      test('10-letter word returns 9 points', () => {
        expect(calculateWordScore('everything')).toBe(9);
      });
    });

    describe('combo scoring', () => {
      test('combo 0 gives no bonus', () => {
        expect(calculateWordScore('hello', 0)).toBe(4);
      });

      test('combo 1 with 5-letter word gives +1 bonus', () => {
        // baseScore(5) = 4, comboBonus(1, 5) = floor(1 * 1.0) = 1
        expect(calculateWordScore('hello', 1)).toBe(5);
      });

      test('combo 3 with 4-letter word gives modest bonus', () => {
        // baseScore(4) = 3, comboBonus(3, 4) = floor(3 * 0.5) = 1
        expect(calculateWordScore('test', 3)).toBe(4);
      });

      test('combo 5 with 6-letter word gives good bonus', () => {
        // baseScore(6) = 5, comboBonus(5, 6) = floor(5 * 1.5) = 7
        expect(calculateWordScore('gaming', 5)).toBe(12);
      });

      test('high combo with long word gives maximum bonus', () => {
        // baseScore(8) = 7, comboBonus(10, 8) = floor(10 * 2.0) = 20
        expect(calculateWordScore('learning', 10)).toBe(27);
      });

      test('short words get minimal combo bonus', () => {
        // baseScore(3) = 2, comboBonus(5, 3) = floor(5 * 0.2) = 1
        expect(calculateWordScore('cat', 5)).toBe(3);
      });
    });

  });

  describe('getComboBonus', () => {

    test('combo 0 returns 0 bonus', () => {
      expect(getComboBonus(0)).toBe(0);
    });

    test('negative combo returns 0 bonus', () => {
      expect(getComboBonus(-1)).toBe(0);
    });

    test('combo 1 with default word length (4) returns modest bonus', () => {
      // floor(1 * 0.5) = 0
      expect(getComboBonus(1, 4)).toBe(0);
    });

    test('combo 2 with 4-letter word', () => {
      // floor(2 * 0.5) = 1
      expect(getComboBonus(2, 4)).toBe(1);
    });

    test('combo 5 with 5-letter word (base factor 1.0)', () => {
      // floor(5 * 1.0) = 5
      expect(getComboBonus(5, 5)).toBe(5);
    });

    test('combo 5 with 7-letter word (perfectionist factor 2.0)', () => {
      // floor(5 * 2.0) = 10
      expect(getComboBonus(5, 7)).toBe(10);
    });

    test('combo 10 with 7-letter word gets max base bonus', () => {
      // floor(10 * 2.0) = 20
      expect(getComboBonus(10, 7)).toBe(20);
    });

    test('combo caps at 10 for base bonus', () => {
      // combo 15 capped to 10, then floor(10 * 2.0) = 20
      expect(getComboBonus(15, 7)).toBe(20);
    });

  });

  describe('getComboMultiplier (legacy)', () => {

    test('combo 0-2 returns 1.0', () => {
      expect(getComboMultiplier(0)).toBe(1.0);
      expect(getComboMultiplier(1)).toBe(1.0);
      expect(getComboMultiplier(2)).toBe(1.0);
    });

    test('combo 3-4 returns 1.25', () => {
      expect(getComboMultiplier(3)).toBe(1.25);
      expect(getComboMultiplier(4)).toBe(1.25);
    });

    test('combo 5-6 returns 1.5', () => {
      expect(getComboMultiplier(5)).toBe(1.5);
      expect(getComboMultiplier(6)).toBe(1.5);
    });

    test('combo 7-8 returns 1.75', () => {
      expect(getComboMultiplier(7)).toBe(1.75);
      expect(getComboMultiplier(8)).toBe(1.75);
    });

    test('combo 9-10 returns 2.0', () => {
      expect(getComboMultiplier(9)).toBe(2.0);
      expect(getComboMultiplier(10)).toBe(2.0);
    });

    test('combo 11+ returns max 2.25', () => {
      expect(getComboMultiplier(11)).toBe(2.25);
      expect(getComboMultiplier(100)).toBe(2.25);
    });

  });

});

describe('Scoring Edge Cases', () => {

  test('empty string word', () => {
    expect(calculateWordScore('')).toBe(-1);
  });

  test('very long word', () => {
    const longWord = 'a'.repeat(20);
    expect(calculateWordScore(longWord)).toBe(19);
  });

  test('word with special characters still scores by length', () => {
    // Note: validation should prevent this, but scoring just counts length
    expect(calculateWordScore("it's")).toBe(3);
  });

  test('maximum reasonable combo level', () => {
    // Even at combo 100, bonus caps at combo 10 base
    const score = calculateWordScore('testing', 100);
    // baseScore(7) = 6, comboBonus(100, 7) = floor(10 * 2.0) = 20
    expect(score).toBe(26);
  });

});
