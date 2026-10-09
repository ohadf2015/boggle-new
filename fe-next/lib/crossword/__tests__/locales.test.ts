import { describe, it, expect } from 'vitest';
import { hasCrosswordPuzzles } from '../locales';
import { getPool } from '../puzzles';
import type { PuzzleLocale } from '../types';

describe('hasCrosswordPuzzles', () => {
  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('%s has its own puzzles', (l) => {
    expect(hasCrosswordPuzzles(l)).toBe(true);
  });
  it('unknown locales do not', () => {
    expect(hasCrosswordPuzzles('fr')).toBe(false);
  });
  it('every supported locale has a non-empty pool in its own language', () => {
    for (const l of ['en', 'he', 'sv', 'ja', 'es', 'ru'] as PuzzleLocale[]) {
      expect(getPool(l).every((p) => p.locale === l)).toBe(true);
      expect(getPool(l).length).toBeGreaterThan(0);
    }
  });
});
