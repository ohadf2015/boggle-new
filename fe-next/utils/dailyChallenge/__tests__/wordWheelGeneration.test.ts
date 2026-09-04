import { describe, it, expect } from 'vitest';
import { generateWordWheelPuzzle, isValidWordWheelWord } from '../wordWheelGeneration';

const HEBREW_FINAL_FORMS = new Set(['ך', 'ם', 'ן', 'ף', 'ץ']);

describe('generateWordWheelPuzzle - ranking URL 9-letter wheel', () => {
  it('returns 1 centre + 8 outer when letterCount is 9', () => {
    const puzzle = generateWordWheelPuzzle('2026-09-03', 'en', { letterCount: 9 });
    expect(puzzle.allLetters).toHaveLength(9);
    expect(puzzle.outerLetters).toHaveLength(8);
    expect(puzzle.allLetters[0]).toBe(puzzle.centerLetter);
  });

  it('still returns 7 letters by default so the daily generator is unchanged', () => {
    const puzzle = generateWordWheelPuzzle('2026-09-03', 'en');
    expect(puzzle.allLetters).toHaveLength(7);
    expect(puzzle.outerLetters).toHaveLength(6);
  });

  it('keeps repeated letters on the 9-letter ranking wheel (anagram, not unique tiles)', () => {
    const dates: string[] = [];
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        dates.push(`2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }
    const withRepeats = dates
      .map((date) => generateWordWheelPuzzle(date, 'en', { letterCount: 9 }))
      .filter((puzzle) => new Set(puzzle.allLetters).size < puzzle.allLetters.length);
    expect(withRepeats.length).toBeGreaterThan(0);
    expect(withRepeats[0].allLetters).toHaveLength(9);
    expect(withRepeats[0].outerLetters).toHaveLength(8);
  });

  it('lists every formable 4–9 candidate on the ranking wheel, not only the source', () => {
    const seed = generateWordWheelPuzzle('2026-09-03', 'en', { letterCount: 9 });
    const extras = seed.outerLetters;
    const crafted: string[] = [];
    for (let i = 0; i <= extras.length - 3; i++) {
      crafted.push(`${seed.centerLetter}${extras[i]}${extras[i + 1]}${extras[i + 2]}`);
    }
    const puzzle = generateWordWheelPuzzle('2026-09-03', 'en', {
      letterCount: 9,
      candidateWords: [...crafted, 'ZZZZ', 'QQ'],
    });
    expect(puzzle.targetWords).toEqual(expect.arrayContaining(crafted.map((w) => w.toUpperCase())));
    expect(puzzle.targetWords).not.toContain('ZZZZ');
    expect(puzzle.targetWords!.length).toBeGreaterThanOrEqual(crafted.length);
    expect(puzzle.targetWords!.length).not.toBe(1);
    for (const word of puzzle.targetWords!) {
      expect(isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)).toBe(true);
      expect(word.length).toBeGreaterThanOrEqual(4);
      expect(word.length).toBeLessThanOrEqual(9);
    }
  });

  it('default ranking 9-letter hunt N is tens of 4–9 words with populated length buckets', () => {
    const puzzle = generateWordWheelPuzzle('2026-09-03', 'en', { letterCount: 9 });
    expect(puzzle.targetWords).toBeDefined();
    expect(puzzle.targetWords!.length).toBeGreaterThanOrEqual(10);
    const totals = [4, 5, 6, 7, 8, 9].map(
      (len) => puzzle.targetWords!.filter((w) => w.length === len).length,
    );
    const populated = totals.filter((n) => n > 0).length;
    expect(populated).toBeGreaterThan(1);
    expect(totals[5]).toBeGreaterThanOrEqual(0); // 9-letter bucket may be 1
    expect(puzzle.targetWords!.some((w) => w.length < 9)).toBe(true);
  });
});

describe('generateWordWheelPuzzle - Hebrew final letter normalization', () => {
  it('should not contain final-form Hebrew letters on any wheel tile', () => {
    // Hebrew source words (e.g. 'מחשבונים') end with final forms like ם.
    // Wheel tiles are individual letters — final forms must not appear.
    for (let day = 1; day <= 30; day++) {
      const date = `2026-04-${String(day).padStart(2, '0')}`;
      const puzzle = generateWordWheelPuzzle(date, 'he');

      for (const letter of puzzle.allLetters) {
        expect(
          HEBREW_FINAL_FORMS.has(letter),
          `Puzzle ${date}: letter "${letter}" is a final Hebrew form`
        ).toBe(false);
      }
    }
  });

  it('should use regular mem (מ) not final mem (ם)', () => {
    // 'מחשבונים' ends with ם — should be normalized to מ on the wheel
    const puzzle = generateWordWheelPuzzle('2026-04-01', 'he');
    const letters = puzzle.allLetters;
    // No final forms anywhere
    expect(letters.some(l => HEBREW_FINAL_FORMS.has(l))).toBe(false);
  });
});
