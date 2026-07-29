import { describe, it, expect } from 'vitest';
import { applyFirstWordBonus, applyScoreMultiplier, FIRST_WORD_MULT, SCORE_MULT, SCORE_MULT_WINDOW_SEC } from '../boostEffects';

describe('boostEffects', () => {
  describe('applyFirstWordBonus', () => {
    it('doubles only the first word score', () => {
      const words = [{ score: 10, ts: 1000 }, { score: 20, ts: 2000 }, { score: 30, ts: 3000 }];
      const out = applyFirstWordBonus(words);
      expect(out[0].score).toBe(10 * FIRST_WORD_MULT);
      expect(out[1].score).toBe(20);
      expect(out[2].score).toBe(30);
    });

    it('returns words unchanged when empty', () => {
      expect(applyFirstWordBonus([])).toEqual([]);
    });
  });

  describe('applyScoreMultiplier', () => {
    it('multiplies words within first 30s window', () => {
      const start = 1000;
      const words = [
        { score: 10, ts: start + 1_000 },
        { score: 20, ts: start + (SCORE_MULT_WINDOW_SEC * 1000 - 1) },
        { score: 30, ts: start + SCORE_MULT_WINDOW_SEC * 1000 + 1 },
      ];
      const out = applyScoreMultiplier(words, start);
      expect(out[0].score).toBe(10 * SCORE_MULT);
      expect(out[1].score).toBe(20 * SCORE_MULT);
      expect(out[2].score).toBe(30);
    });
  });
});
