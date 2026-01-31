/**
 * Hebrew Final Letter Normalization Tests for LessonPractice
 *
 * Verifies that Hebrew final letters (סופיות) are treated as equivalent
 * to their regular forms when comparing user answers to correct answers.
 *
 * Hebrew final letter pairs:
 * - ך ↔ כ (final kaf ↔ kaf)
 * - ם ↔ מ (final mem ↔ mem)
 * - ן ↔ נ (final nun ↔ nun)
 * - ף ↔ פ (final pe ↔ pe)
 * - ץ ↔ צ (final tsade ↔ tsade)
 */

import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';

describe('LessonPractice Hebrew Normalization', () => {
  describe('normalizeWord for Hebrew', () => {
    it('should normalize final kaf (ך) to regular kaf (כ)', () => {
      expect(normalizeWord('מלך', 'he')).toBe(normalizeWord('מלכ', 'he'));
    });

    it('should normalize final mem (ם) to regular mem (מ)', () => {
      expect(normalizeWord('שמים', 'he')).toBe(normalizeWord('שמימ', 'he'));
    });

    it('should normalize final nun (ן) to regular nun (נ)', () => {
      expect(normalizeWord('זמן', 'he')).toBe(normalizeWord('זמנ', 'he'));
    });

    it('should normalize final pe (ף) to regular pe (פ)', () => {
      expect(normalizeWord('כסף', 'he')).toBe(normalizeWord('כספ', 'he'));
    });

    it('should normalize final tsade (ץ) to regular tsade (צ)', () => {
      expect(normalizeWord('עץ', 'he')).toBe(normalizeWord('עצ', 'he'));
    });

    it('should handle words with multiple final letters', () => {
      // Both final forms should normalize to same result
      const word1 = 'מלכים'; // with final mem
      const word2 = 'מלכימ'; // without final mem
      expect(normalizeWord(word1, 'he')).toBe(normalizeWord(word2, 'he'));
    });

    it('should handle word comparison case-insensitively for English', () => {
      expect(normalizeWord('Hello', 'en')).toBe(normalizeWord('hello', 'en'));
    });
  });

  describe('Hebrew word answer comparison', () => {
    /**
     * Simulates the answer comparison logic that should be used in LessonPractice
     */
    function isCorrectAnswer(userAnswer: string, correctAnswer: string, language: Language): boolean {
      const normalizedUser = normalizeWord(userAnswer.trim(), language);
      const normalizedCorrect = normalizeWord(correctAnswer.trim(), language);
      return normalizedUser === normalizedCorrect;
    }

    it('should accept final letter variant as correct answer', () => {
      // User types with final mem, answer stored without
      expect(isCorrectAnswer('שמים', 'שמימ', 'he')).toBe(true);
    });

    it('should accept regular letter variant as correct answer', () => {
      // User types without final mem, answer stored with
      expect(isCorrectAnswer('שמימ', 'שמים', 'he')).toBe(true);
    });

    it('should handle word-final kaf variants', () => {
      expect(isCorrectAnswer('מלך', 'מלכ', 'he')).toBe(true);
      expect(isCorrectAnswer('מלכ', 'מלך', 'he')).toBe(true);
    });

    it('should handle word-final nun variants', () => {
      expect(isCorrectAnswer('זמן', 'זמנ', 'he')).toBe(true);
      expect(isCorrectAnswer('זמנ', 'זמן', 'he')).toBe(true);
    });

    it('should handle word-final pe variants', () => {
      expect(isCorrectAnswer('כסף', 'כספ', 'he')).toBe(true);
      expect(isCorrectAnswer('כספ', 'כסף', 'he')).toBe(true);
    });

    it('should handle word-final tsade variants', () => {
      expect(isCorrectAnswer('עץ', 'עצ', 'he')).toBe(true);
      expect(isCorrectAnswer('עצ', 'עץ', 'he')).toBe(true);
    });

    it('should still reject incorrect words', () => {
      expect(isCorrectAnswer('מים', 'שמים', 'he')).toBe(false);
      expect(isCorrectAnswer('שמש', 'שמים', 'he')).toBe(false);
    });

    it('should handle English words normally', () => {
      expect(isCorrectAnswer('Hello', 'hello', 'en')).toBe(true);
      expect(isCorrectAnswer('WORLD', 'world', 'en')).toBe(true);
    });

    it('should handle whitespace trimming', () => {
      expect(isCorrectAnswer('  שמים  ', 'שמים', 'he')).toBe(true);
      expect(isCorrectAnswer('שמים', '  שמימ  ', 'he')).toBe(true);
    });
  });
});
