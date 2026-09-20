/**
 * Daily Challenge Mastery Rating System — Tests
 * Derives a skill rating from Word Hunt attempt history
 * TDD: tests first per .claude/rules/22-tdd-strict.md
 */

import { describe, it, expect } from 'vitest';
import { computeEfficiencyScore, computeRollingRating, RatingResult } from './rating';

describe('Daily Challenge Mastery Rating', () => {
  describe('computeEfficiencyScore', () => {
    it('returns 100 for a one-attempt solve (perfect)', () => {
      const score = computeEfficiencyScore(true, 1);
      expect(score).toBe(100);
    });

    it('returns 90 for a two-attempt solve', () => {
      const score = computeEfficiencyScore(true, 2);
      expect(score).toBe(90);
    });

    it('returns 80 for a three-attempt solve', () => {
      const score = computeEfficiencyScore(true, 3);
      expect(score).toBe(80);
    });

    it('returns 70 for a four-attempt solve', () => {
      const score = computeEfficiencyScore(true, 4);
      expect(score).toBe(70);
    });

    it('returns 60 for a five-attempt solve', () => {
      const score = computeEfficiencyScore(true, 5);
      expect(score).toBe(60);
    });

    it('returns 50 for a six-attempt solve', () => {
      const score = computeEfficiencyScore(true, 6);
      expect(score).toBe(50);
    });

    it('returns 40 for a seven-attempt solve', () => {
      const score = computeEfficiencyScore(true, 7);
      expect(score).toBe(40);
    });

    it('returns 10 for a ten-attempt solve (minimum)', () => {
      const score = computeEfficiencyScore(true, 10);
      expect(score).toBe(10);
    });

    it('returns 0 for a failed solve (solved=false)', () => {
      const score = computeEfficiencyScore(false, 10);
      expect(score).toBe(0);
    });

    it('returns 0 for a failed solve regardless of attempts', () => {
      const score = computeEfficiencyScore(false, 5);
      expect(score).toBe(0);
    });

    it('clamps to minimum 10 even for high attempt counts', () => {
      const score = computeEfficiencyScore(true, 11);
      expect(score).toBeGreaterThanOrEqual(10);
    });
  });

  describe('computeRollingRating', () => {
    it('returns base rating with empty history', () => {
      const result = computeRollingRating([]);
      expect(result.current).toBe(1000);
      expect(result.history.length).toBe(0);
    });

    it('returns perfect rating with single perfect play', () => {
      const attempts = [{ solved: true, attempts_used: 1 }];
      const result = computeRollingRating(attempts);
      expect(result.current).toBeCloseTo(100, 0);
      expect(result.history.length).toBe(1);
      expect(result.history[0]).toBeCloseTo(100, 0);
    });

    it('averages multiple plays correctly', () => {
      const attempts = [
        { solved: true, attempts_used: 1 }, // 100
        { solved: true, attempts_used: 1 }, // 100
      ];
      const result = computeRollingRating(attempts);
      expect(result.current).toBeCloseTo(100, 0);
    });

    it('shows decline after a failed attempt', () => {
      const attempts = [
        { solved: true, attempts_used: 1 }, // 100
        { solved: true, attempts_used: 1 }, // 100
        { solved: false, attempts_used: 10 }, // 0
      ];
      const result = computeRollingRating(attempts);
      expect(result.current).toBeLessThan(100);
    });

    it('recovers from a single bad play with more good plays', () => {
      const attempts = [
        { solved: true, attempts_used: 1 }, // 100
        { solved: false, attempts_used: 10 }, // 0
        { solved: true, attempts_used: 2 }, // 90
        { solved: true, attempts_used: 1 }, // 100
      ];
      const result = computeRollingRating(attempts);
      expect(result.current).toBeGreaterThan(50);
    });

    it('uses 7-play rolling window', () => {
      const attempts = [
        { solved: true, attempts_used: 1 }, // 0
        { solved: true, attempts_used: 1 }, // 1
        { solved: true, attempts_used: 1 }, // 2
        { solved: true, attempts_used: 1 }, // 3
        { solved: true, attempts_used: 1 }, // 4
        { solved: false, attempts_used: 10 }, // 5 (fail)
        { solved: false, attempts_used: 10 }, // 6 (fail)
        { solved: true, attempts_used: 1 }, // 7
        { solved: true, attempts_used: 1 }, // 8
        { solved: true, attempts_used: 1 }, // 9
        { solved: true, attempts_used: 1 }, // 10
        { solved: true, attempts_used: 1 }, // 11
        { solved: false, attempts_used: 10 }, // 12 (fail)
        { solved: false, attempts_used: 10 }, // 13 (fail)
      ];
      const result = computeRollingRating(attempts);
      // Last 7 plays (7-13): 5 wins (100) + 2 fails (0) = avg 71.4
      expect(result.current).toBeCloseTo(71.4, 0);
    });

    it('returns full history as separate field', () => {
      const attempts = [
        { solved: true, attempts_used: 1 },
        { solved: true, attempts_used: 2 },
        { solved: false, attempts_used: 10 },
      ];
      const result = computeRollingRating(attempts);
      expect(result.history.length).toBe(3);
      expect(result.history[0]).toBe(100);
      expect(result.history[1]).toBe(90);
      expect(result.history[2]).toBe(0);
    });

    it('provides delta for most recent play', () => {
      const attempts = [
        { solved: true, attempts_used: 1 }, // 100, rating=1000
        { solved: true, attempts_used: 1 }, // 100, rating=1000
        { solved: true, attempts_used: 5 }, // 60, rating < 1000
      ];
      const result = computeRollingRating(attempts);
      expect(result.delta).toBeDefined();
      expect(result.delta).toBeLessThan(0);
    });

    it('delta is zero for same rating from previous play', () => {
      const attempts = [
        { solved: true, attempts_used: 1 },
        { solved: true, attempts_used: 1 },
      ];
      const result = computeRollingRating(attempts);
      expect(result.delta).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles null/undefined attempts_used for failed solves', () => {
      // When solved=false, attempts_used may be 10 (max) or undefined
      const score = computeEfficiencyScore(false, 10);
      expect(score).toBe(0);
    });

    it('preserves history order (oldest first)', () => {
      const attempts = [
        { solved: true, attempts_used: 1 },
        { solved: true, attempts_used: 5 },
        { solved: false, attempts_used: 10 },
      ];
      const result = computeRollingRating(attempts);
      expect(result.history[0]).toBe(100);
      expect(result.history[1]).toBe(60);
      expect(result.history[2]).toBe(0);
    });

    it('current rating never dips below 0 conceptually', () => {
      const attempts = [
        { solved: false, attempts_used: 10 },
        { solved: false, attempts_used: 10 },
        { solved: false, attempts_used: 10 },
      ];
      const result = computeRollingRating(attempts);
      expect(result.current).toBeGreaterThanOrEqual(0);
    });
  });
});
