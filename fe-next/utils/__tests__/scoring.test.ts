import { calculateWordScoreByLength as calculateWordScoreSimple } from '@/shared/utils/scoring';
import { calculateEfficiencyScore, getScoreBreakdown } from '../aiHintGenerator';

describe('Scoring Utilities', () => {
  describe('calculateWordScore (simple version)', () => {
    it('calculates exponential base scores', () => {
      expect(calculateWordScoreSimple(2)).toBe(5);
      expect(calculateWordScoreSimple(3)).toBe(10);
      expect(calculateWordScoreSimple(4)).toBe(20);
      expect(calculateWordScoreSimple(5)).toBe(50);
      expect(calculateWordScoreSimple(6)).toBe(100);
      expect(calculateWordScoreSimple(7)).toBe(200);
      expect(calculateWordScoreSimple(8)).toBe(500);
    });
    it('returns 0 for single letter', () => { expect(calculateWordScoreSimple(1)).toBe(0); });
    it('handles edge cases', () => {
      expect(calculateWordScoreSimple(0)).toBe(0);
      expect(calculateWordScoreSimple(10)).toBeGreaterThan(0);
    });
    it('8+ letter words all score 500', () => {
      expect(calculateWordScoreSimple(8)).toBe(500);
      expect(calculateWordScoreSimple(9)).toBe(500);
      expect(calculateWordScoreSimple(10)).toBe(500);
    });
  });

  describe('getScoreBreakdown (Season 2 Formula)', () => {
    it('returns zero when not solved', () => { const b = getScoreBreakdown(100, 1, 20, false); expect(b.total).toBe(0); });
    it('calculates perfect 1000', () => { const b = getScoreBreakdown(100, 1, 20, true); expect(b.total).toBe(1000); });
    it('caps life at 100', () => { const b = getScoreBreakdown(150, 1, 20, true); expect(b.speed).toBe(400); });
    it('caps words at 20', () => { const b = getScoreBreakdown(100, 1, 50, true); expect(b.exploration).toBe(200); });
    it('-40 per guess', () => { expect(getScoreBreakdown(100, 2, 20, true).accuracy).toBe(360); });
    it('accuracy min 0', () => { expect(getScoreBreakdown(100, 15, 20, true).accuracy).toBe(0); });
    it('0 life', () => { expect(getScoreBreakdown(0, 1, 20, true).speed).toBe(0); });
    // New rule: a fast clean solve floors exploration so it isn't punished for
    // farming no words. Guess 1 with 0 words → full 200 exploration credit.
    it('guess-1 solve floors exploration at 200 even with 0 words', () => { expect(getScoreBreakdown(100, 1, 0, true).exploration).toBe(200); });
    it('guess-2 solve floors exploration at 150 with 0 words', () => { expect(getScoreBreakdown(100, 2, 0, true).exploration).toBe(150); });
    it('word volume still wins when higher than the efficiency floor', () => { expect(getScoreBreakdown(100, 3, 15, true).exploration).toBe(150); });
    it('late solve with 0 words gets 0 exploration (floor tapered out)', () => { expect(getScoreBreakdown(100, 8, 0, true).exploration).toBe(0); });
    it('includes raw', () => { const b = getScoreBreakdown(75, 3, 12, true); expect(b.raw.lifeRemaining).toBe(75); });
    it('handles negatives', () => { const b = getScoreBreakdown(-10, -5, -3, true); expect(b.speed).toBe(0); expect(b.accuracy).toBe(400); });
  });

  describe('calculateEfficiencyScore', () => {
    it('returns 0 when unsolved', () => { expect(calculateEfficiencyScore(100, 50, 1, 20, false)).toBe(0); });
    it('ignores unusedTokens', () => {
      expect(calculateEfficiencyScore(100, 50, 1, 20, true)).toBe(1000);
      expect(calculateEfficiencyScore(100, 0, 1, 20, true)).toBe(1000);
    });
    it('matches breakdown total', () => {
      const b = getScoreBreakdown(75, 3, 15, true);
      expect(calculateEfficiencyScore(75, 999, 3, 15, true)).toBe(b.total);
    });
    it('balanced play styles', () => {
      const speed = calculateEfficiencyScore(90, 0, 8, 5, true);
      const explorer = calculateEfficiencyScore(40, 0, 2, 25, true);
      expect(speed).toBeGreaterThan(400);
      expect(explorer).toBeGreaterThan(400);
      expect(Math.abs(speed - explorer)).toBeLessThan(200);
    });
  });
});
