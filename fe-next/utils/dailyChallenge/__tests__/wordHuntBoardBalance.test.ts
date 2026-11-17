import { describe, it, expect } from 'vitest';
import { generateDailyPuzzle, isWordOnGrid } from '../gridGeneration';
import type { Language } from '../../../types';

const LANGS: Language[] = ['en', 'he', 'sv', 'es', 'ru'];
const DATES = Array.from({ length: 60 }, (_, d) =>
  new Date(Date.UTC(2026, 9, 1) + d * 864e5).toISOString().slice(0, 10));

function counts(cells: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cells) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

describe('Word Hunt board balance', () => {
  describe.each(LANGS)('%s', (lang) => {
    const puzzles = DATES.map((date) => generateDailyPuzzle(date, lang));

    it('Given a daily board, Then the target word is still on it', () => {
      for (const p of puzzles) expect(isWordOnGrid(p.targetWord, p.grid)).toBe(true);
    });

    it('Given a daily board, Then no letter floods it', () => {
      for (const p of puzzles) {
        const target = counts(p.targetWord.split(''));
        for (const [letter, n] of counts(p.grid.flat())) {
          expect(n, `${p.puzzleDate} ${p.targetWord} ${letter}`)
            .toBeLessThanOrEqual(Math.max(4, (target.get(letter) ?? 0) + 1));
        }
      }
    });

    it('Given many boards, Then target letters do not dominate the board', () => {
      const share = puzzles.reduce((sum, p) => {
        const set = new Set(p.targetWord.split(''));
        const cells = p.grid.flat();
        return sum + cells.filter((c) => set.has(c)).length / cells.length;
      }, 0) / puzzles.length;
      expect(share).toBeLessThan(0.45);
    });
  });

  it.each([
    ['en', 'AEIOU'], ['sv', 'AEIOUYÅÄÖ'], ['es', 'AEIOUÁÉÍÓÚÜ'], ['ru', 'АЕЁИОУЫЭЮЯ'],
  ] as const)('Given %s boards, Then every board has enough vowels to make words', (lang, vowelString) => {
    const vowels = new Set(vowelString.split(''));
    for (const date of DATES) {
      const cells = generateDailyPuzzle(date, lang).grid.flat();
      expect(cells.filter((c) => vowels.has(c)).length / cells.length, date).toBeGreaterThanOrEqual(0.28);
    }
  });

  it.each([
    ['en', 'QJXZ'], ['sv', 'QWXZC'], ['es', 'ÁÉÍÓÚÜKWXQ'],
  ] as const)('Given %s boards, Then rare letters stay rare', (lang, rareString) => {
    const rare = new Set(rareString.split(''));
    const total = DATES.reduce((sum, date) =>
      sum + generateDailyPuzzle(date, lang).grid.flat().filter((c) => rare.has(c)).length, 0);
    expect(total / DATES.length).toBeLessThan(1);
  });
});
