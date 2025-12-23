/**
 * Scoring Utility Tests
 * 
 * Tests for scoring calculations used in the game
 */

import { calculateWordScore as calculateWordScoreSimple } from '@/shared/constants/gameConstants';

describe('Scoring Utilities', () => {
  describe('calculateWordScore (simple version)', () => {
    it('calculates base score correctly for different word lengths', () => {
      expect(calculateWordScoreSimple(2)).toBe(1);
      expect(calculateWordScoreSimple(3)).toBe(1);
      expect(calculateWordScoreSimple(4)).toBe(2);
      expect(calculateWordScoreSimple(5)).toBe(3);
      expect(calculateWordScoreSimple(6)).toBe(4);
      expect(calculateWordScoreSimple(7)).toBe(5);
      expect(calculateWordScoreSimple(8)).toBe(6);
    });

    it('returns 0 for single letter words', () => {
      expect(calculateWordScoreSimple(1)).toBe(0);
    });

    it('handles edge cases', () => {
      expect(calculateWordScoreSimple(0)).toBe(0);
      expect(calculateWordScoreSimple(10)).toBeGreaterThan(0);
      expect(calculateWordScoreSimple(15)).toBeGreaterThan(0);
    });

    it('handles very long words with bonus', () => {
      const score8 = calculateWordScoreSimple(8);
      const score9 = calculateWordScoreSimple(9);
      const score10 = calculateWordScoreSimple(10);
      
      expect(score9).toBeGreaterThan(score8);
      expect(score10).toBeGreaterThan(score9);
    });
  });
});

