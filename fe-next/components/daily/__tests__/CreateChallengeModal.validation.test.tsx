/**
 * Tests for CreateChallengeModal word validation rules
 *
 * This test validates that:
 * 1. Custom daily challenges accept 4-8 letter words (not 5-8)
 * 2. Word validation respects language-specific patterns
 */

import * as fs from 'fs';
import * as path from 'path';

describe('CreateChallengeModal - Word Validation', () => {
  const modalPath = path.join(__dirname, '../CreateChallengeModal.tsx');
  const modalCode = fs.readFileSync(modalPath, 'utf-8');

  describe('Custom challenge word length validation', () => {
    it('should accept 4-8 letter words for custom challenges (not 5-8)', () => {
      // Extract the validateWord function
      const validateWordMatch = modalCode.match(/const validateWord = \(word: string\): string \| null => \{[\s\S]*?\n  \};/);
      expect(validateWordMatch).toBeTruthy();

      const validateWordCode = validateWordMatch![0];

      // For custom challenges (not tied to board size), we should allow 4-8 letters
      // The current code incorrectly uses board size to determine min/max
      // Expected behavior: const minLen = 4; const maxLen = 8;

      // Check that we're NOT using board size for length validation
      // This test will FAIL initially because current code has:
      // const minLen = boardSize === 5 ? 5 : 6;
      expect(validateWordCode).not.toContain('boardSize === 5 ? 5 : 6');
      expect(validateWordCode).not.toContain('boardSize === 5 ? 8 : 10');

      // Check that we ARE using fixed 4-8 length for custom challenges
      expect(validateWordCode).toContain('const minLen = 4');
      expect(validateWordCode).toContain('const maxLen = 8');
    });

    it('should have correct placeholder showing 4-8 letter range', () => {
      // The placeholder should show 4-8, not dynamic based on board size
      const placeholderMatch = modalCode.match(/placeholder=\{t\('daily\.wordPlaceholder',\s*\{[\s\S]*?\}\)\}/);
      expect(placeholderMatch).toBeTruthy();

      const placeholderCode = placeholderMatch![0];

      // Should NOT dynamically calculate min/max based on board size
      expect(placeholderCode).not.toContain('boardSize === 5 ? 5 : 6');
      expect(placeholderCode).not.toContain('boardSize === 5 ? 8 : 10');

      // Should use fixed values 4 and 8
      expect(placeholderCode).toContain('min: 4');
      expect(placeholderCode).toContain('max: 8');
    });
  });

  describe('Translation key validation', () => {
    it('should use translation keys for all error messages', () => {
      expect(modalCode).toContain("t('daily.errorWordRequired')");
      expect(modalCode).toContain("t('daily.errorWordTooShort'");
      expect(modalCode).toContain("t('daily.errorWordTooLong'");
      expect(modalCode).toContain("t('daily.errorInvalidLetters')");
    });
  });
});
