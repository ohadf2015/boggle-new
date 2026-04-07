/**
 * Custom Challenge Board Generation Tests
 *
 * Tests to ensure custom challenge boards ALWAYS contain the target word
 */

import { generateCustomChallengeGrid } from '../customChallengeGrid';
import { isWordOnBoard } from '../utils';
import type { Language } from '@/types';

describe('Custom Challenge Grid Generation', () => {
  const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es'];
  const boardSizes = [5, 7];
  const testWords: Partial<Record<Language, string[]>> = {
    en: ['CAT', 'DOG', 'BIRD', 'FISH', 'ELEPHANT'],
    he: ['חתול', 'כלב', 'ציפור', 'דג'],
    sv: ['KATT', 'HUND', 'FÅGEL', 'FISK'],
    ja: ['日本', '東京', '学校'],
    es: ['GATO', 'PERRO', 'PÁJARO', 'PEZ'],
  };

  describe('Target Word Embedding', () => {
    languages.forEach((language) => {
      describe(`${language} language`, () => {
        boardSizes.forEach((size) => {
          const words = testWords[language] || [];
          words.forEach((word) => {
            it(`should ALWAYS embed target word "${word}" in ${size}x${size} grid`, () => {
              // Generate grid 10 times to ensure consistency
              for (let attempt = 0; attempt < 10; attempt++) {
                const grid = generateCustomChallengeGrid(size, size, language, word);

                // Critical assertion: target word MUST be on the board
                const found = isWordOnBoard(word, grid, language);
                expect(found).toBe(true);
              }
            });
          });
        });
      });
    });
  });

  describe('Grid Validity', () => {
    it('should return a valid grid with correct dimensions', () => {
      const grid = generateCustomChallengeGrid(5, 5, 'en', 'TEST');

      expect(grid).toHaveLength(5);
      expect(grid[0]).toHaveLength(5);
      expect(grid.every((row: string[]) => row.length === 5)).toBe(true);
    });

    it('should fill all cells with letters', () => {
      const grid = generateCustomChallengeGrid(5, 5, 'en', 'TEST');

      grid.forEach((row: string[]) => {
        row.forEach((cell: string) => {
          expect(cell).toBeTruthy();
          expect(typeof cell).toBe('string');
          expect(cell.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short words (3 letters)', () => {
      const grid = generateCustomChallengeGrid(5, 5, 'en', 'CAT');
      expect(isWordOnBoard('CAT', grid, 'en')).toBe(true);
    });

    it('should handle longer words (8 letters)', () => {
      const grid = generateCustomChallengeGrid(7, 7, 'en', 'ELEPHANT');
      expect(isWordOnBoard('ELEPHANT', grid, 'en')).toBe(true);
    });

    it('should handle Hebrew final letters correctly', () => {
      const grid = generateCustomChallengeGrid(5, 5, 'he', 'חתולם');
      // Should normalize final letters and still find the word
      expect(isWordOnBoard('חתולם', grid, 'he')).toBe(true);
    });

    it('should handle Japanese kanji compounds', () => {
      const grid = generateCustomChallengeGrid(5, 5, 'ja', '日本');
      expect(isWordOnBoard('日本', grid, 'ja')).toBe(true);
    });
  });
});
