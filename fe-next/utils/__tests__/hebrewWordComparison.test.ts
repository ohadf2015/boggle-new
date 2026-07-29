/**
 * Hebrew Word Comparison Tests
 *
 * Tests for Hebrew final letter normalization in word matching.
 * This addresses the bug where custom puzzles created with Hebrew words
 * containing final letters (ך, ם, ן, ף, ץ) fail to match player submissions.
 */

import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import { normalizeHebrewFinalLetters } from '../dailyChallenge/constants';
import { getLetterFeedback, isTargetWordFound } from '../wordHuntFeedback';

/**
 * Helper function that mimics the target word comparison logic.
 * This should normalize Hebrew words before comparison.
 */
function areWordsEqual(word1: string, word2: string, language: string): boolean {
  if (language === 'he') {
    // Both words should be normalized to handle final letters
    const normalized1 = normalizeHebrewWord(word1.toUpperCase());
    const normalized2 = normalizeHebrewWord(word2.toUpperCase());
    return normalized1 === normalized2;
  }
  return word1.toUpperCase() === word2.toUpperCase();
}

describe('Hebrew Final Letter Normalization', () => {
  describe('normalizeHebrewWord', () => {
    it('should convert final kaf (ך) to regular kaf (כ)', () => {
      expect(normalizeHebrewWord('מלך')).toBe('מלכ');
    });

    it('should convert final mem (ם) to regular mem (מ)', () => {
      expect(normalizeHebrewWord('שלום')).toBe('שלומ');
    });

    it('should convert final nun (ן) to regular nun (נ)', () => {
      expect(normalizeHebrewWord('בטן')).toBe('בטנ');
    });

    it('should convert final pe (ף) to regular pe (פ)', () => {
      expect(normalizeHebrewWord('כסף')).toBe('כספ');
    });

    it('should convert final tsade (ץ) to regular tsade (צ)', () => {
      expect(normalizeHebrewWord('עץ')).toBe('עצ');
    });

    it('should convert multiple final letters in one word', () => {
      // Word with multiple final letters
      expect(normalizeHebrewWord('םןך')).toBe('מנכ');
    });

    it('should leave words without final letters unchanged', () => {
      expect(normalizeHebrewWord('שלומ')).toBe('שלומ');
      expect(normalizeHebrewWord('אבג')).toBe('אבג');
    });
  });

  describe('normalizeHebrewFinalLetters', () => {
    it('should normalize final letters same as normalizeHebrewWord', () => {
      expect(normalizeHebrewFinalLetters('שלום')).toBe(normalizeHebrewWord('שלום'));
      expect(normalizeHebrewFinalLetters('מלך')).toBe(normalizeHebrewWord('מלך'));
    });
  });

  describe('Word Comparison with Final Letters', () => {
    it('should match "שלום" (with final mem) to "שלומ" (without final)', () => {
      expect(areWordsEqual('שלום', 'שלומ', 'he')).toBe(true);
    });

    it('should match "מלך" (with final kaf) to "מלכ" (without final)', () => {
      expect(areWordsEqual('מלך', 'מלכ', 'he')).toBe(true);
    });

    it('should match words where player submits final and target has regular', () => {
      // Player submits with final letter, target stored with regular
      expect(areWordsEqual('שלום', 'שלומ', 'he')).toBe(true);
    });

    it('should match words where player submits regular and target has final', () => {
      // Player submits without final letter, target stored with final
      expect(areWordsEqual('שלומ', 'שלום', 'he')).toBe(true);
    });

    it('should match identical words (both with final letters)', () => {
      expect(areWordsEqual('שלום', 'שלום', 'he')).toBe(true);
    });

    it('should match identical words (both without final letters)', () => {
      expect(areWordsEqual('שלומ', 'שלומ', 'he')).toBe(true);
    });

    it('should not match different Hebrew words', () => {
      expect(areWordsEqual('שלום', 'מלך', 'he')).toBe(false);
    });

    it('should handle case-insensitive English comparison', () => {
      expect(areWordsEqual('HELLO', 'hello', 'en')).toBe(true);
    });
  });

  describe('Custom Puzzle Scenario - Bug Reproduction', () => {
    /**
     * BUG: When creating a custom puzzle in Hebrew:
     * 1. User enters "שלום" (with final mem)
     * 2. Grid is created with letters normalized (מ instead of ם)
     * 3. Target word is stored as "שלום" (uppercased, but final letters NOT normalized)
     * 4. Player tries to guess "שלומ" or "שלום"
     * 5. Comparison: "שלום".toUpperCase() !== "שלומ".toUpperCase() → FAILS!
     *
     * FIX: Both target word and submitted word should be normalized
     * for Hebrew before comparison.
     */

    it('should match player guess against stored target with final letters', () => {
      const storedTargetWord = 'שלום'; // Target stored with final mem
      const playerGuess = 'שלומ';       // Player guesses without final (grid shows מ)

      // This is the bug scenario - without normalization, these don't match
      const withoutNormalization = storedTargetWord.toUpperCase() === playerGuess.toUpperCase();
      expect(withoutNormalization).toBe(false); // Bug: fails to match

      // With proper normalization, they should match
      expect(areWordsEqual(storedTargetWord, playerGuess, 'he')).toBe(true);
    });

    it('should match regardless of which form the player uses', () => {
      const storedTargetWord = 'חתולים'; // "cats" with final mem

      // Player might type either form
      expect(areWordsEqual(storedTargetWord, 'חתולים', 'he')).toBe(true); // Same as stored
      expect(areWordsEqual(storedTargetWord, 'חתולימ', 'he')).toBe(true); // Regular mem
    });

    it('should handle words with multiple final letters', () => {
      // Word ending in both final nun and final mem would be unusual,
      // but the system should handle any combination
      const wordWithFinals = 'ץך'; // Final tsade and final kaf
      const wordWithRegulars = 'צכ'; // Regular tsade and regular kaf

      expect(areWordsEqual(wordWithFinals, wordWithRegulars, 'he')).toBe(true);
    });
  });

  describe('getLetterFeedback with Hebrew', () => {
    it('should mark all letters green when target has final and submitted has regular', () => {
      // Target stored with final mem (ם), player submits with regular mem (מ)
      const feedback = getLetterFeedback('שלומ', 'שלום', 'he');
      expect(isTargetWordFound(feedback)).toBe(true);
      expect(feedback.every(f => f.feedback === 'green')).toBe(true);
    });

    it('should mark all letters green when target has regular and submitted has final', () => {
      // Target stored with regular mem (מ), player submits with final mem (ם)
      const feedback = getLetterFeedback('שלום', 'שלומ', 'he');
      expect(isTargetWordFound(feedback)).toBe(true);
      expect(feedback.every(f => f.feedback === 'green')).toBe(true);
    });

    it('should correctly identify all letters as green for identical Hebrew words', () => {
      const feedback = getLetterFeedback('שלום', 'שלום', 'he');
      expect(isTargetWordFound(feedback)).toBe(true);
    });

    it('should show correct yellow feedback for Hebrew letters', () => {
      // Word contains correct letters but in wrong positions
      // Target: שלום, Submitted: מלוש (reversed order with final replaced)
      const feedback = getLetterFeedback('מלוש', 'שלום', 'he');
      // All letters exist in target, just wrong positions
      expect(feedback.every(f => f.feedback === 'yellow' || f.feedback === 'green')).toBe(true);
    });

    it('should work normally for English words', () => {
      const feedback = getLetterFeedback('HELLO', 'HELLO', 'en');
      expect(isTargetWordFound(feedback)).toBe(true);
    });

    it('should work without language parameter (backward compatibility)', () => {
      const feedback = getLetterFeedback('HELLO', 'HELLO');
      expect(isTargetWordFound(feedback)).toBe(true);
    });
  });
});
