import { describe, it, expect } from 'vitest';
import { generateWordWheelPuzzle } from '../wordWheelGeneration';

const HEBREW_FINAL_FORMS = new Set(['ך', 'ם', 'ן', 'ף', 'ץ']);

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
