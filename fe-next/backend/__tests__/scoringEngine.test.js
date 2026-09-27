import { calculateWordScore, getComboBonus, getComboMultiplier } from '../modules/scoringEngine';
describe('Scoring Engine', () => {
  describe('calculateWordScore', () => {
    describe('base scoring (no combo)', () => {
      test('single letter word returns 0', () => { expect(calculateWordScore('a')).toBe(0); });
      test('2-letter word returns 5', () => { expect(calculateWordScore('at')).toBe(5); });
      test('3-letter word returns 10', () => { expect(calculateWordScore('cat')).toBe(10); });
      test('4-letter word returns 20', () => { expect(calculateWordScore('word')).toBe(20); });
      test('5-letter word returns 50', () => { expect(calculateWordScore('hello')).toBe(50); });
      test('7-letter word returns 200', () => { expect(calculateWordScore('testing')).toBe(200); });
      test('10-letter word returns 500', () => { expect(calculateWordScore('everything')).toBe(500); });
    });

    describe('combo scoring', () => {
      test('combo 0 gives no bonus', () => { expect(calculateWordScore('hello', 0)).toBe(50); });
      test('combo 1 with 5-letter word', () => { expect(calculateWordScore('hello', 1)).toBe(51); });
      test('combo 3 with 4-letter word', () => { expect(calculateWordScore('test', 3)).toBe(21); });
      test('combo 5 with 6-letter word', () => { expect(calculateWordScore('gaming', 5)).toBe(107); });
      test('high combo with long word', () => { expect(calculateWordScore('learning', 10)).toBe(520); });
      test('short words get minimal combo bonus', () => { expect(calculateWordScore('cat', 5)).toBe(11); });
    });
  });

  describe('getComboBonus', () => {
    test('combo 0 returns 0', () => { expect(getComboBonus(0)).toBe(0); });
    test('negative combo returns 0', () => { expect(getComboBonus(-1)).toBe(0); });
    test('combo 1 with 4-letter word', () => { expect(getComboBonus(1, 4)).toBe(0); });
    test('combo 2 with 4-letter word', () => { expect(getComboBonus(2, 4)).toBe(1); });
    test('combo 5 with 5-letter word', () => { expect(getComboBonus(5, 5)).toBe(5); });
    test('combo 5 with 7-letter word', () => { expect(getComboBonus(5, 7)).toBe(10); });
    test('combo 10 with 7-letter word', () => { expect(getComboBonus(10, 7)).toBe(20); });
    test('combo scales without cap', () => { expect(getComboBonus(15, 7)).toBe(30); });
  });

  describe('getComboMultiplier (legacy)', () => {
    test('combo 0-2 returns 1.0', () => { expect(getComboMultiplier(0)).toBe(1.0); expect(getComboMultiplier(2)).toBe(1.0); });
    test('combo 3-4 returns 1.25', () => { expect(getComboMultiplier(3)).toBe(1.25); });
    test('combo 5-6 returns 1.5', () => { expect(getComboMultiplier(5)).toBe(1.5); });
    test('combo 25+ returns 3.0', () => { expect(getComboMultiplier(25)).toBe(3.0); });
  });
});

describe('Scoring Edge Cases', () => {
  test('empty string word', () => { expect(calculateWordScore('')).toBe(0); });
  test('very long word', () => { expect(calculateWordScore('a'.repeat(20))).toBe(500); });
  test('special characters', () => { expect(calculateWordScore("it's")).toBe(20); });
  test('very high combo', () => { expect(calculateWordScore('testing', 100)).toBe(400); });
});
