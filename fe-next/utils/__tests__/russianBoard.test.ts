import { describe, it, expect } from 'vitest';
import { generateRandomTable } from '@/utils/utils';
import { generateDailyGrid } from '@/utils/dailyChallenge/gridGeneration';
import { generateCustomChallengeGrid } from '@/utils/customChallengeGrid';

const cellsOf = (grid: string[][]): string[] => grid.flat();
// A Cyrillic board must contain ONLY Cyrillic letters — никаких Hebrew tiles.
const isCyrillic = (ch: string): boolean => /^[А-ЯЁ]$/.test(ch);
const HEBREW = /[֐-׿]/;

/**
 * Regression: Russian boards were leaking Hebrew letters because the frontend
 * grid generators routed 'ru' into the Hebrew `else` fallback (only the backend
 * generator had been given a `ru` branch). See screenshot bug report.
 */
describe('Russian board generation (frontend generators)', () => {
  it('GIVEN ru WHEN generateRandomTable THEN every cell is Cyrillic, never Hebrew', () => {
    for (let i = 0; i < 25; i++) {
      const cells = cellsOf(generateRandomTable(5, 5, 'ru'));
      for (const cell of cells) {
        expect(HEBREW.test(cell)).toBe(false);
        expect(isCyrillic(cell)).toBe(true);
      }
    }
  });

  it('GIVEN ru board THEN never produces Ё or hard-sign Ъ (dead/foldable tiles)', () => {
    for (let i = 0; i < 25; i++) {
      const cells = cellsOf(generateRandomTable(5, 5, 'ru'));
      expect(cells.includes('Ё')).toBe(false);
      expect(cells.includes('Ъ')).toBe(false);
    }
  });

  it('GIVEN ru WHEN generateDailyGrid THEN every cell is Cyrillic, never Hebrew', () => {
    const cells = cellsOf(generateDailyGrid('2026-06-30', 'ru', 5, 5));
    for (const cell of cells) {
      expect(HEBREW.test(cell)).toBe(false);
      expect(isCyrillic(cell)).toBe(true);
    }
  });

  it('GIVEN ru WHEN generateCustomChallengeGrid THEN filler cells are Cyrillic, never Hebrew', () => {
    const cells = cellsOf(generateCustomChallengeGrid(5, 5, 'ru', 'СЛОВО'));
    for (const cell of cells) {
      expect(HEBREW.test(cell)).toBe(false);
      expect(isCyrillic(cell)).toBe(true);
    }
  });
});
