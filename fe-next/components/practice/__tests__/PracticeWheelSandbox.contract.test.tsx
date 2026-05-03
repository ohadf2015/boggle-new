/**
 * Curation contract: every word in the wheel valid set MUST contain the
 * center letter. The sandbox enforces this rule at submit time, so any
 * word that violates the contract is dead content (looks valid, never
 * counts). Caught a real bug when introduced — keeping it as a guard.
 */
import { describe, it, expect } from 'vitest';

interface WheelPuzzle {
  center: string;
  outer: string[];
  validWords: ReadonlySet<string>;
}

const PUZZLES: Record<string, WheelPuzzle> = {
  en: {
    center: 'A',
    outer: ['T', 'R', 'C', 'E'],
    validWords: new Set(['CAR', 'CAT', 'RAT', 'ACE', 'CARE', 'RACE', 'TEAR', 'RATE', 'CRATE', 'REACT', 'ACT', 'ATE', 'EAR', 'EAT', 'ART', 'TAR']),
  },
  he: {
    center: 'א',
    outer: ['ב', 'ם', 'מ', 'ה'],
    validWords: new Set(['אם', 'בא', 'אבא', 'אמא', 'אבה', 'מאה', 'אהבה']),
  },
  sv: {
    center: 'A',
    outer: ['T', 'R', 'K', 'E'],
    validWords: new Set(['ATT', 'ARK', 'AKTE', 'TAR', 'TEA', 'RAT', 'ART']),
  },
  ja: {
    center: 'い',
    outer: ['ぬ', 'と', 'け', 'ま'],
    validWords: new Set(['いぬ', 'いと', 'いけ', 'いま', 'けい', 'まい']),
  },
  es: {
    center: 'A',
    outer: ['C', 'S', 'M', 'E'],
    validWords: new Set(['CASA', 'AME', 'MASA', 'SACA', 'AMA', 'MAS', 'ASA', 'CASE']),
  },
};

describe('PracticeWheelSandbox curation contract', () => {
  for (const [locale, puzzle] of Object.entries(PUZZLES)) {
    describe(`locale: ${locale}`, () => {
      const allowedLetters = new Set([puzzle.center, ...puzzle.outer]);
      for (const word of puzzle.validWords) {
        it(`"${word}" contains the center letter '${puzzle.center}'`, () => {
          expect(Array.from(word).includes(puzzle.center)).toBe(true);
        });
        it(`"${word}" only uses letters from the wheel`, () => {
          for (const ch of Array.from(word)) {
            expect(allowedLetters.has(ch)).toBe(true);
          }
        });
      }
    });
  }
});
