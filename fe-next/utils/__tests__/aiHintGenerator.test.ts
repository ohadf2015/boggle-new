/**
 * Tests for AI Hint Generator
 *
 * Focus areas:
 * 1. Bug fix: Hints should NEVER reveal the last letter of the word
 * 2. calculateRevealOrder excludes last position
 * 3. generateFallbackHints respects the last-letter rule
 */

import { generateFallbackHints, type HintLevel } from '../aiHintGenerator';

describe('aiHintGenerator', () => {
  describe('generateFallbackHints - Last Letter Protection', () => {
    it('should never reveal the last letter position in any hint level', () => {
      // Test various word lengths
      const testWords = ['CAT', 'WORD', 'APPLE', 'BANANA', 'ELEPHANT'];

      for (const word of testWords) {
        const result = generateFallbackHints(word, 'en');
        const lastPosition = word.length - 1;

        // Check each hint level
        for (const hint of result.hints) {
          const hintChars = hint.hint.split(' ');

          // The last position should always be '_' (hidden)
          expect(hintChars[lastPosition]).toBe('_');
        }
      }
    });

    it('should reveal first letter (not last) for vowel-less words', () => {
      // Words without vowels (rare, but possible with abbreviations)
      const word = 'RHYTHM'; // Has Y which might not be counted as vowel in basic set
      const result = generateFallbackHints(word, 'en');

      // Level 2 should reveal something, but NOT the last letter
      const level2 = result.hints.find(h => h.level === 2);
      expect(level2).toBeDefined();

      if (level2) {
        const hintChars = level2.hint.split(' ');
        const lastPosition = word.length - 1;

        // Last position should still be hidden
        expect(hintChars[lastPosition]).toBe('_');
      }
    });

    it('should handle 2-letter words without revealing the last letter', () => {
      const word = 'GO';
      const result = generateFallbackHints(word, 'en');

      // For a 2-letter word, only 1 letter can be revealed (50% = 1)
      // But it should NOT be the last letter
      for (const hint of result.hints) {
        const hintChars = hint.hint.split(' ');
        // Last position (index 1) should be hidden
        expect(hintChars[1]).toBe('_');
      }
    });

    it('should handle 3-letter words correctly', () => {
      const word = 'CAT';
      const result = generateFallbackHints(word, 'en');

      // For 3-letter word, maxReveal = 1 (50% of 3 = 1.5, rounded down)
      // Can reveal 1 letter, but NOT the last one
      for (const hint of result.hints) {
        const hintChars = hint.hint.split(' ');
        // Last position (index 2) should be hidden
        expect(hintChars[2]).toBe('_');
      }
    });

    it('should reveal at most 50% of letters excluding the last', () => {
      const word = 'ELEPHANT'; // 8 letters
      const result = generateFallbackHints(word, 'en');

      // Max reveal = 4 (50% of 8)
      // But none of them should be the last letter
      const level5 = result.hints.find(h => h.level === 5);
      expect(level5).toBeDefined();

      if (level5) {
        const hintChars = level5.hint.split(' ');
        const revealedCount = hintChars.filter(c => c !== '_').length;

        // Should reveal at most 4 letters
        expect(revealedCount).toBeLessThanOrEqual(4);
        // Last position should be hidden
        expect(hintChars[7]).toBe('_');
      }
    });

    it('should work correctly with Hebrew vowel-less words', () => {
      // Hebrew consonant-only words (no matres lectionis)
      const word = 'שלם'; // SHIN-LAMED-MEM
      const result = generateFallbackHints(word, 'he');

      for (const hint of result.hints) {
        const hintChars = hint.hint.split(' ');
        const lastPosition = word.length - 1;

        // Last position should be hidden
        expect(hintChars[lastPosition]).toBe('_');
      }
    });
  });

  describe('generateFallbackHints - Hint Structure', () => {
    it('should generate correct number of hint levels', () => {
      const word = 'APPLE'; // 5 letters
      const result = generateFallbackHints(word, 'en');

      // Should have levels 1-5 for 4+ letter words
      expect(result.hints).toHaveLength(5);
      expect(result.hints.map(h => h.level)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should generate fewer hint levels for short words', () => {
      const word = 'CAT'; // 3 letters
      const result = generateFallbackHints(word, 'en');

      // Short words only get levels 1 and 2
      expect(result.hints).toHaveLength(2);
      expect(result.hints.map(h => h.level)).toEqual([1, 2]);
    });

    it('should have level 1 with all blanks', () => {
      const word = 'APPLE';
      const result = generateFallbackHints(word, 'en');

      const level1 = result.hints.find(h => h.level === 1);
      expect(level1).toBeDefined();
      expect(level1?.hint).toBe('_ _ _ _ _');
      expect(level1?.unlockCost).toBe(0); // Free
    });

    it('should include category and example sentence', () => {
      const word = 'APPLE';
      const result = generateFallbackHints(word, 'en');

      expect(result.category).toBeDefined();
      expect(result.exampleSentence).toBeDefined();
      expect(result.exampleSentence.length).toBeGreaterThan(0);
    });
  });

  describe('generateFallbackHints - Vowel Priority', () => {
    it('should reveal non-final vowels before consonants', () => {
      const word = 'APPLE'; // Vowels at positions 0 (A), 4 (E - but this is the last letter)
      const result = generateFallbackHints(word, 'en');

      // Level 2 should reveal a vowel, but NOT the last position
      // Since E is at position 4 (last), it should reveal A at position 0
      const level2 = result.hints.find(h => h.level === 2);
      expect(level2).toBeDefined();

      if (level2) {
        const hintChars = level2.hint.split(' ');
        // Position 0 (A) should be revealed since position 4 (E) is the last letter
        expect(hintChars[0]).toBe('A');
        // Position 4 should still be hidden (it's the last letter)
        expect(hintChars[4]).toBe('_');
      }
    });

    it('should reveal middle vowel for word with vowel at last position', () => {
      const word = 'MOVIE'; // Vowels at positions 1 (O), 3 (I), 4 (E - last)
      const result = generateFallbackHints(word, 'en');

      const level2 = result.hints.find(h => h.level === 2);
      expect(level2).toBeDefined();

      if (level2) {
        const hintChars = level2.hint.split(' ');
        // Should reveal I at position 3 (last non-final vowel from the end)
        // Position 4 (E) is excluded because it's the last letter
        expect(hintChars[3]).toBe('I');
        expect(hintChars[4]).toBe('_');
      }
    });
  });
});
