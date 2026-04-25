/**
 * Tests for shared drill-level promotion logic.
 *
 * Server (`/api/drills/submit`) and client (`useBrainScore` consumers)
 * both need the same answer to "did this score earn a level-up?". This
 * module is the single source of truth.
 *
 * @module shared/utils/__tests__/drillLeveling.test
 */

import {
  DRILL_TARGET_SCORES,
  MAX_DRILL_LEVEL,
  MIN_DRILL_LEVEL,
  computeDrillProgressUpdate,
  getDrillTargetScore,
  getNextDrillLevel,
} from '../drillLeveling';

describe('drillLeveling', () => {
  describe('DRILL_TARGET_SCORES', () => {
    it('exposes the 5-level target ladder used by every drill', () => {
      expect(DRILL_TARGET_SCORES).toEqual([50, 100, 200, 350, 500]);
    });

    it('is monotonically increasing', () => {
      for (let i = 1; i < DRILL_TARGET_SCORES.length; i++) {
        expect(DRILL_TARGET_SCORES[i]).toBeGreaterThan(DRILL_TARGET_SCORES[i - 1]);
      }
    });
  });

  describe('MIN/MAX_DRILL_LEVEL', () => {
    it('matches drill component LEVEL_CONFIGS bounds', () => {
      expect(MIN_DRILL_LEVEL).toBe(1);
      expect(MAX_DRILL_LEVEL).toBe(5);
      expect(DRILL_TARGET_SCORES.length).toBe(MAX_DRILL_LEVEL);
    });
  });

  describe('getDrillTargetScore', () => {
    it('returns the threshold for the requested level', () => {
      expect(getDrillTargetScore(1)).toBe(50);
      expect(getDrillTargetScore(2)).toBe(100);
      expect(getDrillTargetScore(3)).toBe(200);
      expect(getDrillTargetScore(4)).toBe(350);
      expect(getDrillTargetScore(5)).toBe(500);
    });

    it('clamps below MIN to L1 target', () => {
      expect(getDrillTargetScore(0)).toBe(50);
      expect(getDrillTargetScore(-3)).toBe(50);
    });

    it('clamps above MAX to L5 target', () => {
      expect(getDrillTargetScore(6)).toBe(500);
      expect(getDrillTargetScore(99)).toBe(500);
    });

    it('rounds non-integer levels down', () => {
      expect(getDrillTargetScore(2.9)).toBe(100);
    });
  });

  describe('getNextDrillLevel', () => {
    it('promotes when score meets the current level target', () => {
      expect(getNextDrillLevel(1, 50)).toBe(2);
      expect(getNextDrillLevel(2, 100)).toBe(3);
      expect(getNextDrillLevel(3, 200)).toBe(4);
      expect(getNextDrillLevel(4, 350)).toBe(5);
    });

    it('promotes when score exceeds the target', () => {
      expect(getNextDrillLevel(1, 500)).toBe(2);
      expect(getNextDrillLevel(2, 9999)).toBe(3);
    });

    it('stays at current level when score is below target', () => {
      expect(getNextDrillLevel(1, 0)).toBe(1);
      expect(getNextDrillLevel(1, 49)).toBe(1);
      expect(getNextDrillLevel(3, 199)).toBe(3);
    });

    it('caps promotion at MAX_DRILL_LEVEL', () => {
      expect(getNextDrillLevel(5, 500)).toBe(5);
      expect(getNextDrillLevel(5, 999_999)).toBe(5);
    });

    it('clamps invalid current levels into range before evaluating', () => {
      // Below min: treated as L1
      expect(getNextDrillLevel(0, 50)).toBe(2);
      expect(getNextDrillLevel(-2, 49)).toBe(1);
      // Above max: capped at L5, never promoted further
      expect(getNextDrillLevel(99, 9999)).toBe(5);
    });

    it('rejects non-finite scores by returning current level (defensive)', () => {
      expect(getNextDrillLevel(2, Number.NaN)).toBe(2);
      expect(getNextDrillLevel(2, Number.POSITIVE_INFINITY)).toBe(2);
      expect(getNextDrillLevel(2, Number.NEGATIVE_INFINITY)).toBe(2);
    });

    it('rejects negative scores by returning current level (defensive)', () => {
      expect(getNextDrillLevel(2, -1)).toBe(2);
    });
  });

  describe('computeDrillProgressUpdate', () => {
    const baseProgress = {
      level: 1,
      highScore: 30,
      totalPlays: 2,
      totalScore: 60,
    };

    it('promotes level when score clears the current target', () => {
      const out = computeDrillProgressUpdate(baseProgress, 60);
      expect(out.level).toBe(2);
      expect(out.totalPlays).toBe(3);
      expect(out.totalScore).toBe(120);
      expect(out.highScore).toBe(60);
      expect(out.avgScore).toBe(40);
    });

    it('keeps level when score is below target', () => {
      const out = computeDrillProgressUpdate(baseProgress, 49);
      expect(out.level).toBe(1);
    });

    it('does not lower the high score', () => {
      const out = computeDrillProgressUpdate({ ...baseProgress, highScore: 200 }, 30);
      expect(out.highScore).toBe(200);
    });

    it('rounds avg score to nearest integer', () => {
      const out = computeDrillProgressUpdate(
        { level: 1, highScore: 0, totalPlays: 0, totalScore: 0 },
        33
      );
      expect(out.totalPlays).toBe(1);
      expect(out.totalScore).toBe(33);
      expect(out.avgScore).toBe(33);
    });

    it('seeds from a missing/null prior progress row (first play)', () => {
      const out = computeDrillProgressUpdate(null, 75);
      expect(out.level).toBe(2); // 75 ≥ 50 (L1 target)
      expect(out.totalPlays).toBe(1);
      expect(out.totalScore).toBe(75);
      expect(out.highScore).toBe(75);
      expect(out.avgScore).toBe(75);
    });

    it('caps promotion at MAX_DRILL_LEVEL even with huge scores', () => {
      const out = computeDrillProgressUpdate(
        { level: 5, highScore: 500, totalPlays: 10, totalScore: 4000 },
        9999
      );
      expect(out.level).toBe(5);
    });

    it('clamps invalid score to current level (no XP from negative scores)', () => {
      const out = computeDrillProgressUpdate(baseProgress, -50);
      expect(out.level).toBe(1);
      expect(out.highScore).toBe(30);
      // negative score still increments totalPlays + adds 0 to totalScore
      expect(out.totalPlays).toBe(3);
      expect(out.totalScore).toBe(60);
    });
  });
});
