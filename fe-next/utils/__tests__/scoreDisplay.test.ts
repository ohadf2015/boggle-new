import { SCORE_DISPLAY_MULTIPLIER, displayScore, formatScore } from '../scoreDisplay';

describe('scoreDisplay', () => {
  describe('SCORE_DISPLAY_MULTIPLIER', () => {
    it('should be 10', () => {
      expect(SCORE_DISPLAY_MULTIPLIER).toBe(10);
    });
  });

  describe('displayScore', () => {
    it('should multiply score by 10', () => {
      expect(displayScore(5)).toBe(50);
      expect(displayScore(0)).toBe(0);
      expect(displayScore(123)).toBe(1230);
    });

    it('should handle negative scores', () => {
      expect(displayScore(-3)).toBe(-30);
    });
  });

  describe('formatScore', () => {
    it('should return locale-formatted multiplied score', () => {
      // 1500 * 10 = 15000 → "15,000" in en-US (or locale equivalent)
      const result = formatScore(1500);
      expect(result).toBe((15000).toLocaleString());
    });

    it('should return "0" for zero', () => {
      expect(formatScore(0)).toBe('0');
    });
  });
});
