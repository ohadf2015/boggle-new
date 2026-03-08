/**
 * Scoring Utility Tests
 *
 * Tests for scoring calculations used in the game
 */

import { calculateWordScoreByLength as calculateWordScoreSimple } from '@/shared/utils/scoring';
import { calculateEfficiencyScore, getScoreBreakdown, type ScoreBreakdown } from '../aiHintGenerator';

describe('Scoring Utilities', () => {
  describe('calculateWordScore (simple version)', () => {
    // Formula: wordLength - 1 (each letter beyond the first = 1 point)
    it('calculates base score correctly for different word lengths', () => {
      expect(calculateWordScoreSimple(2)).toBe(1);  // 2-1 = 1
      expect(calculateWordScoreSimple(3)).toBe(2);  // 3-1 = 2
      expect(calculateWordScoreSimple(4)).toBe(3);  // 4-1 = 3
      expect(calculateWordScoreSimple(5)).toBe(4);  // 5-1 = 4
      expect(calculateWordScoreSimple(6)).toBe(5);  // 6-1 = 5
      expect(calculateWordScoreSimple(7)).toBe(6);  // 7-1 = 6
      expect(calculateWordScoreSimple(8)).toBe(7);  // 8-1 = 7
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

  describe('getScoreBreakdown (Season 2 Formula)', () => {
    it('returns zero breakdown when puzzle is not solved', () => {
      const breakdown = getScoreBreakdown(100, 1, 20, false);

      expect(breakdown.total).toBe(0);
      expect(breakdown.speed).toBe(0);
      expect(breakdown.accuracy).toBe(0);
      expect(breakdown.exploration).toBe(0);
    });

    it('calculates perfect score of 1000', () => {
      // Perfect game: 100+ life, 1 guess, 20+ words
      const breakdown = getScoreBreakdown(100, 1, 20, true);

      expect(breakdown.speed).toBe(400);
      expect(breakdown.accuracy).toBe(400);
      expect(breakdown.exploration).toBe(200);
      expect(breakdown.total).toBe(1000);
      expect(breakdown.maxScore).toBe(1000);
    });

    it('caps life at 100 for speed calculation', () => {
      // Life above 100 should not give extra points
      const breakdown = getScoreBreakdown(150, 1, 20, true);

      expect(breakdown.speed).toBe(400); // Capped at 100 × 4
      expect(breakdown.total).toBe(1000);
    });

    it('caps words at 20 for exploration bonus', () => {
      // Finding more than 20 words should not give extra points
      const breakdown = getScoreBreakdown(100, 1, 50, true);

      expect(breakdown.exploration).toBe(200); // Capped at 20 × 10
      expect(breakdown.total).toBe(1000);
    });

    it('applies -40 penalty per additional guess', () => {
      const oneGuess = getScoreBreakdown(100, 1, 20, true);
      const twoGuesses = getScoreBreakdown(100, 2, 20, true);
      const threeGuesses = getScoreBreakdown(100, 3, 20, true);

      expect(oneGuess.accuracy).toBe(400);
      expect(twoGuesses.accuracy).toBe(360); // 400 - 40
      expect(threeGuesses.accuracy).toBe(320); // 400 - 80
    });

    it('accuracy score cannot go below 0', () => {
      // 11+ guesses should result in 0 accuracy
      const breakdown = getScoreBreakdown(100, 15, 20, true);

      expect(breakdown.accuracy).toBe(0);
      expect(breakdown.total).toBe(600); // 400 speed + 0 accuracy + 200 exploration
    });

    it('handles edge case of 0 life remaining', () => {
      const breakdown = getScoreBreakdown(0, 1, 20, true);

      expect(breakdown.speed).toBe(0);
      expect(breakdown.total).toBe(600); // 0 + 400 + 200
    });

    it('handles edge case of 0 words found', () => {
      const breakdown = getScoreBreakdown(100, 1, 0, true);

      expect(breakdown.exploration).toBe(0);
      expect(breakdown.total).toBe(800); // 400 + 400 + 0
    });

    it('includes raw values in breakdown', () => {
      const breakdown = getScoreBreakdown(75, 3, 12, true);

      expect(breakdown.raw.lifeRemaining).toBe(75);
      expect(breakdown.raw.guessesUsed).toBe(3);
      expect(breakdown.raw.wordsFound).toBe(12);
    });

    it('handles negative inputs gracefully', () => {
      const breakdown = getScoreBreakdown(-10, -5, -3, true);

      expect(breakdown.speed).toBe(0);
      expect(breakdown.accuracy).toBe(400); // guesses clamped to 1
      expect(breakdown.exploration).toBe(0);
    });
  });

  describe('calculateEfficiencyScore', () => {
    it('returns 0 when puzzle is not solved', () => {
      expect(calculateEfficiencyScore(100, 50, 1, 20, false)).toBe(0);
    });

    it('ignores unusedTokens parameter (deprecated)', () => {
      // Both calls should return the same score regardless of tokens
      const withTokens = calculateEfficiencyScore(100, 50, 1, 20, true);
      const withoutTokens = calculateEfficiencyScore(100, 0, 1, 20, true);

      expect(withTokens).toBe(1000);
      expect(withoutTokens).toBe(1000);
    });

    it('matches getScoreBreakdown total', () => {
      const breakdown = getScoreBreakdown(75, 3, 15, true);
      const score = calculateEfficiencyScore(75, 999, 3, 15, true);

      expect(score).toBe(breakdown.total);
    });

    it('produces balanced scores for different play styles', () => {
      // Speed demon: fast but inaccurate
      const speedDemon = calculateEfficiencyScore(90, 0, 8, 5, true);

      // Explorer: slow but thorough
      const explorer = calculateEfficiencyScore(40, 0, 2, 25, true);

      // Both should be viable strategies with similar scores
      expect(speedDemon).toBeGreaterThan(400);
      expect(explorer).toBeGreaterThan(400);

      // Neither should dominate the other completely
      expect(Math.abs(speedDemon - explorer)).toBeLessThan(200);
    });
  });
});

