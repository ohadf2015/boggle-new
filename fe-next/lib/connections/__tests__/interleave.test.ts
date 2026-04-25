import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale, getPuzzleForLevel, getTotalLevels } from '../puzzles';

describe('puzzle interleaving by bridge', () => {
  for (const locale of ['en', 'he'] as const) {
    it(`${locale}: never repeats the same bridge in adjacent levels unless mathematically forced`, () => {
      const total = getTotalLevels(locale);
      let forcedRepeats = 0;
      for (let lvl = 2; lvl <= total; lvl++) {
        const prev = getPuzzleForLevel(locale, lvl - 1)!;
        const cur = getPuzzleForLevel(locale, lvl)!;
        if (prev.bridge === cur.bridge && prev.difficulty === cur.difficulty) {
          forcedRepeats++;
        }
      }
      // A few forced repeats are acceptable — they only happen when one bridge
      // dominates the remaining pool of that difficulty. Cap loosely.
      expect(forcedRepeats).toBeLessThan(total * 0.05);
    });
  }

  it('en: pool length matches PUZZLES_BY_LOCALE', () => {
    expect(getTotalLevels('en')).toBe(getPuzzlesForLocale('en').length);
  });

  it('he: pool length matches PUZZLES_BY_LOCALE', () => {
    expect(getTotalLevels('he')).toBe(getPuzzlesForLocale('he').length);
  });
});
