/**
 * Tests for Hebrew Word Hunt Validation
 * Ensures Hebrew final letters are properly normalized during validation
 *
 * Bug reproduction: Word Hunt validation fails for Hebrew words with final letters
 * because `.toUpperCase()` doesn't normalize Hebrew final forms (ם vs מ)
 */

import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

/**
 * Helper that mimics the current buggy validation in dailyChallenge.ts:640-643
 * This uses `.toUpperCase()` which doesn't normalize Hebrew final letters
 */
function buggyComparison(expected: string, submitted: string): boolean {
  const expectedUpper = expected.toUpperCase();
  const submittedUpper = submitted.toUpperCase();
  return expectedUpper === submittedUpper;
}

/**
 * Helper that properly handles Hebrew final letter normalization
 * This is the fix we need to implement
 */
function correctHebrewComparison(expected: string, submitted: string, language: string): boolean {
  if (language === 'he') {
    const normalizedExpected = normalizeHebrewWord(expected);
    const normalizedSubmitted = normalizeHebrewWord(submitted);
    return normalizedExpected === normalizedSubmitted;
  }
  return expected.toUpperCase() === submitted.toUpperCase();
}

describe('Hebrew Word Hunt Validation - Bug Reproduction', () => {
  describe('Current buggy behavior', () => {
    it('should FAIL to match אדם (with final mem ם) vs אדמ (with regular mem מ)', () => {
      // This demonstrates the bug:
      // - Expected word: אדם (adam - "man/person") ends with final mem (ם)
      // - Submitted word: אדמ ends with regular mem (מ)
      // - These should match but don't because toUpperCase doesn't normalize Hebrew
      const expected = 'אדם';  // With final mem (ם)
      const submitted = 'אדמ'; // With regular mem (מ)

      // The buggy comparison returns false when it should return true
      expect(buggyComparison(expected, submitted)).toBe(false);
    });

    it('should FAIL to match שלום (with final mem) vs שלומ (with regular mem)', () => {
      const expected = 'שלום';  // With final mem
      const submitted = 'שלומ'; // With regular mem

      // Bug: toUpperCase doesn't normalize, so comparison fails
      expect(buggyComparison(expected, submitted)).toBe(false);
    });

    it('should FAIL to match מלך (with final kaf ך) vs מלכ (with regular kaf כ)', () => {
      const expected = 'מלך';  // With final kaf
      const submitted = 'מלכ'; // With regular kaf

      expect(buggyComparison(expected, submitted)).toBe(false);
    });
  });

  describe('Correct behavior with Hebrew normalization', () => {
    it('should match אדם vs אדמ when using proper Hebrew normalization', () => {
      const expected = 'אדם';  // With final mem
      const submitted = 'אדמ'; // With regular mem

      expect(correctHebrewComparison(expected, submitted, 'he')).toBe(true);
    });

    it('should match שלום vs שלומ when using proper Hebrew normalization', () => {
      const expected = 'שלום';
      const submitted = 'שלומ';

      expect(correctHebrewComparison(expected, submitted, 'he')).toBe(true);
    });

    it('should match מלך vs מלכ when using proper Hebrew normalization', () => {
      const expected = 'מלך';
      const submitted = 'מלכ';

      expect(correctHebrewComparison(expected, submitted, 'he')).toBe(true);
    });

    it('should match words with final nun (ן vs נ)', () => {
      const expected = 'בטן';  // With final nun
      const submitted = 'בטנ'; // With regular nun

      expect(correctHebrewComparison(expected, submitted, 'he')).toBe(true);
    });

    it('should match words with final pe (ף vs פ)', () => {
      const expected = 'כסף';  // With final pe
      const submitted = 'כספ'; // With regular pe

      expect(correctHebrewComparison(expected, submitted, 'he')).toBe(true);
    });

    it('should match words with final tsade (ץ vs צ)', () => {
      const expected = 'עץ';  // With final tsade
      const submitted = 'עצ'; // With regular tsade

      expect(correctHebrewComparison(expected, submitted, 'he')).toBe(true);
    });

    it('should still work for identical Hebrew words', () => {
      const word = 'אדם';
      expect(correctHebrewComparison(word, word, 'he')).toBe(true);
    });

    it('should not match different Hebrew words', () => {
      expect(correctHebrewComparison('אדם', 'שלום', 'he')).toBe(false);
    });

    it('should work for English words (no change needed)', () => {
      expect(correctHebrewComparison('HELLO', 'hello', 'en')).toBe(true);
      expect(correctHebrewComparison('WORLD', 'world', 'en')).toBe(true);
    });
  });
});
