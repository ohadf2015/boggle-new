import { SCORE_DISPLAY_MULTIPLIER, displayScore, formatScore } from '../scoreDisplay';

describe('scoreDisplay', () => {
  describe('SCORE_DISPLAY_MULTIPLIER', () => {
    it('should be 1 (no inflation — exponential base scores are sufficient)', () => {
      expect(SCORE_DISPLAY_MULTIPLIER).toBe(1);
    });
  });

  describe('displayScore', () => {
    it('should return the score as-is', () => {
      expect(displayScore(5)).toBe(5);
      expect(displayScore(0)).toBe(0);
      expect(displayScore(123)).toBe(123);
    });

    it('should handle negative scores', () => {
      expect(displayScore(-3)).toBe(-3);
    });
  });

  describe('formatScore', () => {
    it('should return locale-formatted score', () => {
      const result = formatScore(1500);
      expect(result).toBe((1500).toLocaleString());
    });

    it('should return "0" for zero', () => {
      expect(formatScore(0)).toBe('0');
    });
  });
});
