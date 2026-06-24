// End-to-end guarantee: the REAL generator, fed the REAL committed clue banks, must never place a
// clue that gives away its answer (circular) — for every shipped locale. This is the regression
// guard for the "nonsense riddles" fix: the old isCircularClue was Latin-only, so ~20% of the
// Hebrew bank was circular and rendered as-is. See generate.runtime.ts (no gating at generation —
// the bank is the source of truth, so the bank must be clean).
import { describe, it, expect } from 'vitest';
import { generatePuzzle, type ClueMap } from '../generate.runtime';
import { isCircularClue } from '../clues/clueText';
import enBank from '../data/clueBank.en.json';
import heBank from '../data/clueBank.he.json';
import esBank from '../data/clueBank.es.json';
import svBank from '../data/clueBank.sv.json';
import type { PuzzleLocale } from '../types';

const BANKS: Record<string, ClueMap> = {
  en: enBank as unknown as ClueMap,
  he: heBank as unknown as ClueMap,
  es: esBank as unknown as ClueMap,
  sv: svBank as unknown as ClueMap,
};

// gen locale mirrors generate.daily.genLocaleFor: he→he, es→es (accent-folded 4×4 keys),
// sv→sv (4×4, å/ä/ö kept), else en.
const CASES: Array<{ locale: PuzzleLocale; gen: 'en' | 'he' | 'es' | 'sv' }> = [
  { locale: 'en', gen: 'en' },
  { locale: 'he', gen: 'he' },
  { locale: 'sv', gen: 'sv' },
  { locale: 'es', gen: 'es' },
];

describe('crossword generation never places a circular clue', () => {
  for (const { locale, gen } of CASES) {
    it(`${locale}: 30 generated puzzles all have clean, answer-free clues`, { timeout: 300000 }, () => {
      const clues = BANKS[gen];
      let produced = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const puzzle = generatePuzzle({ seed, locale, clues, difficulty: 'medium' });
        if (!puzzle) continue; // generation can occasionally fail a seed; covered by success-rate test
        produced += 1;
        for (const slot of puzzle.slots) {
          expect(slot.clue, `${locale} seed ${seed} slot ${slot.id} (${slot.answer})`).toBeTruthy();
          expect(
            isCircularClue(slot.clue, slot.answer),
            `${locale} seed ${seed}: clue "${slot.clue}" gives away answer "${slot.answer}"`,
          ).toBe(false);
        }
      }
      expect(produced, `${locale} generated at least some puzzles`).toBeGreaterThan(0);
    });
  }

  it('he generator success rate is healthy (>80% of seeds yield a puzzle)', () => {
    const clues = BANKS.he;
    let ok = 0;
    for (let seed = 1; seed <= 40; seed++) {
      if (generatePuzzle({ seed, locale: 'he', clues, difficulty: 'medium' })) ok += 1;
    }
    expect(ok, `he produced ${ok}/40`).toBeGreaterThan(32);
  });
});
