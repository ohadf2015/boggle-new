/**
 * Grid Generation Tests
 *
 * Tests for isWordOnGrid function with focus on Hebrew final letter normalization
 */

import { isWordOnGrid } from '../gridGeneration';
import type { LetterGrid } from '@/types';

describe('isWordOnGrid', () => {
  describe('basic functionality', () => {
    it('should return true when word exists on grid horizontally', () => {
      // GIVEN - A grid with "CAT" horizontally
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['M', 'N', 'O'],
      ];

      // WHEN - Checking if "CAT" is on the grid
      const result = isWordOnGrid('CAT', grid);

      // THEN - Should return true
      expect(result).toBe(true);
    });

    it('should return true when word exists on grid diagonally', () => {
      // GIVEN - A grid with "CAT" diagonally
      const grid: LetterGrid = [
        ['C', 'X', 'Y'],
        ['Z', 'A', 'W'],
        ['M', 'N', 'T'],
      ];

      // WHEN - Checking if "CAT" is on the grid
      const result = isWordOnGrid('CAT', grid);

      // THEN - Should return true
      expect(result).toBe(true);
    });

    it('should return false when word does not exist on grid', () => {
      // GIVEN - A grid without "DOG"
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['M', 'N', 'O'],
      ];

      // WHEN - Checking if "DOG" is on the grid
      const result = isWordOnGrid('DOG', grid);

      // THEN - Should return false
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      // GIVEN - A grid with "CAT" in uppercase
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['M', 'N', 'O'],
      ];

      // WHEN - Checking if "cat" (lowercase) is on the grid
      const result = isWordOnGrid('cat', grid);

      // THEN - Should return true
      expect(result).toBe(true);
    });
  });

  describe('Hebrew final letter normalization', () => {
    /**
     * Hebrew has 5 letters with "final" forms (sofit) used at word endings:
     * - כ (kaf) → ך (final kaf)
     * - מ (mem) → ם (final mem)
     * - נ (nun) → ן (final nun)
     * - פ (pe) → ף (final pe)
     * - צ (tsade) → ץ (final tsade)
     *
     * The grid stores REGULAR forms only, but dictionary words use FINAL forms.
     * isWordOnGrid must normalize final letters to find words correctly.
     */

    it('should find Hebrew word with final mem (ם) when grid has regular mem (מ)', () => {
      // GIVEN - A grid with regular letters (כ-ו-כ-ב-י-מ)
      // The grid stores 'מ' (regular mem) not 'ם' (final mem)
      const grid: LetterGrid = [
        ['כ', 'ו', 'כ'],
        ['ב', 'י', 'מ'],
        ['ש', 'ל', 'ח'],
      ];

      // WHEN - Checking if "כוכבים" (stars - ends with final mem ם) is on the grid
      // Word path: כ(0,0) → ו(0,1) → כ(0,2) → ב(1,0) → י(1,1) → ם→מ(1,2)
      const result = isWordOnGrid('כוכבים', grid);

      // THEN - Should return true (final ם should match regular מ)
      expect(result).toBe(true);
    });

    it('should find Hebrew word with final nun (ן) when grid has regular nun (נ)', () => {
      // GIVEN - A grid with regular nun (נ)
      const grid: LetterGrid = [
        ['ל', 'ב', 'נ'],
        ['ש', 'ח', 'מ'],
        ['ת', 'ר', 'ע'],
      ];

      // WHEN - Checking if "לבן" (white - ends with final nun ן) is on the grid
      const result = isWordOnGrid('לבן', grid);

      // THEN - Should return true (final ן should match regular נ)
      expect(result).toBe(true);
    });

    it('should find Hebrew word with final kaf (ך) when grid has regular kaf (כ)', () => {
      // GIVEN - A grid with regular kaf (כ)
      const grid: LetterGrid = [
        ['מ', 'ל', 'כ'],
        ['ש', 'ח', 'ב'],
        ['ת', 'ר', 'ע'],
      ];

      // WHEN - Checking if "מלך" (king - ends with final kaf ך) is on the grid
      const result = isWordOnGrid('מלך', grid);

      // THEN - Should return true (final ך should match regular כ)
      expect(result).toBe(true);
    });

    it('should find Hebrew word with final pe (ף) when grid has regular pe (פ)', () => {
      // GIVEN - A grid with regular pe (פ)
      const grid: LetterGrid = [
        ['כ', 'ס', 'פ'],
        ['ש', 'ח', 'ב'],
        ['ת', 'ר', 'ע'],
      ];

      // WHEN - Checking if "כסף" (money - ends with final pe ף) is on the grid
      const result = isWordOnGrid('כסף', grid);

      // THEN - Should return true (final ף should match regular פ)
      expect(result).toBe(true);
    });

    it('should find Hebrew word with final tsade (ץ) when grid has regular tsade (צ)', () => {
      // GIVEN - A grid with regular tsade (צ)
      const grid: LetterGrid = [
        ['ע', 'צ', 'פ'],
        ['ש', 'ח', 'ב'],
        ['ת', 'ר', 'נ'],
      ];

      // WHEN - Checking if "עץ" (tree - ends with final tsade ץ) is on the grid
      const result = isWordOnGrid('עץ', grid);

      // THEN - Should return true (final ץ should match regular צ)
      expect(result).toBe(true);
    });

    it('should handle word with multiple final letters normalized', () => {
      // GIVEN - A grid where a word might have multiple final letters
      // "כנסת" could theoretically end in multiple sofits if modified
      const grid: LetterGrid = [
        ['מ', 'ל', 'כ'],
        ['ש', 'פ', 'ב'],
        ['ת', 'ר', 'נ'],
      ];

      // WHEN - Checking words with different final letter patterns
      // "מלך" (king) - final kaf
      const result = isWordOnGrid('מלך', grid);

      // THEN - Should handle correctly
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return false for empty word', () => {
      const grid: LetterGrid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];

      expect(isWordOnGrid('', grid)).toBe(false);
    });

    it('should return false for empty grid', () => {
      const grid: LetterGrid = [];

      expect(isWordOnGrid('TEST', grid)).toBe(false);
    });

    it('should return false for null/undefined grid', () => {
      expect(isWordOnGrid('TEST', null as unknown as LetterGrid)).toBe(false);
      expect(isWordOnGrid('TEST', undefined as unknown as LetterGrid)).toBe(false);
    });
  });
});
