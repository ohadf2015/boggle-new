/**
 * Tests for forgiving drill scoring.
 *
 * The contract that matters: forgive the DISPLAY, keep the METRIC honest.
 * - `displayScore` is floored + always-positive → the celebratory number a
 *   player sees, drives badge + gold floor + warm tone. Never insulting.
 * - `performanceScore` is HONEST (un-floored) → this is what feeds the
 *   cognitive-domain rolling average. A wiped session returns a genuinely
 *   low number so the Brain Score / radar stays truthful.
 *
 * These tests lock the split so nobody later wires the floored number into
 * the metric (which would turn the dashboard into a participation trophy).
 *
 * @module shared/utils/__tests__/drillScoring.test
 */

import {
  calculateForgivingDrillScore,
  badgeForRatio,
  type ForgivingScoreInput,
} from '../drillScoring';

const base = (over: Partial<ForgivingScoreInput> = {}): ForgivingScoreInput => ({
  level: 1,
  rawScore: 0,
  wordsFound: 0,
  target: 8,
  setbacks: 0,
  maxSetbacks: 3,
  ...over,
});

describe('calculateForgivingDrillScore', () => {
  describe('participation floor (never insulting, never 0)', () => {
    it('gives a positive displayScore even on a fully wiped session', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 0, wordsFound: 0, setbacks: 3, maxSetbacks: 3 })
      );
      expect(r.displayScore).toBeGreaterThan(0);
      expect(r.participation).toBeGreaterThan(0);
      expect(r.displayScore).toBeGreaterThanOrEqual(r.participation);
    });

    it('floor scales up with level (higher levels feel more rewarding)', () => {
      const lvl1 = calculateForgivingDrillScore(base({ level: 1 }));
      const lvl5 = calculateForgivingDrillScore(base({ level: 5 }));
      expect(lvl5.participation).toBeGreaterThan(lvl1.participation);
    });
  });

  describe('honest metric (performanceScore is NOT floored)', () => {
    it('returns a genuinely LOW performanceScore on a wiped session', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 0, wordsFound: 0, setbacks: 3, maxSetbacks: 3 })
      );
      // The visible number is cushioned...
      expect(r.displayScore).toBeGreaterThan(0);
      // ...but the metric tells the truth.
      expect(r.performanceScore).toBe(0);
      expect(r.performanceScore).toBeLessThan(r.displayScore);
    });

    it('performanceScore reaches high on a strong, setback-free session', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 500, wordsFound: 8, target: 8, setbacks: 0 })
      );
      expect(r.performanceScore).toBeGreaterThanOrEqual(80);
    });

    it('performanceScore is monotonic in wordsFound (more found = not lower)', () => {
      const few = calculateForgivingDrillScore(base({ rawScore: 50, wordsFound: 2, target: 8 }));
      const many = calculateForgivingDrillScore(base({ rawScore: 200, wordsFound: 6, target: 8 }));
      expect(many.performanceScore).toBeGreaterThanOrEqual(few.performanceScore);
    });
  });

  describe('always-colored badge (bronze is still a win)', () => {
    it('wiped session still earns bronze, never a falsy/empty badge', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 0, wordsFound: 0, setbacks: 3, maxSetbacks: 3 })
      );
      expect(r.badge).toBe('bronze');
    });

    it('hitting target with no setbacks earns gold or platinum', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 500, wordsFound: 8, target: 8, setbacks: 0 })
      );
      expect(['gold', 'platinum']).toContain(r.badge);
    });

    it('partial effort lands in the silver/bronze middle, never gray/none', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 120, wordsFound: 4, target: 8, setbacks: 1 })
      );
      expect(['bronze', 'silver', 'gold']).toContain(r.badge);
    });
  });

  describe('displayScore monotonicity (more reps = bigger number)', () => {
    it('more words and fewer setbacks never lowers displayScore', () => {
      const worse = calculateForgivingDrillScore(
        base({ rawScore: 40, wordsFound: 2, target: 8, setbacks: 2, maxSetbacks: 3 })
      );
      const better = calculateForgivingDrillScore(
        base({ rawScore: 220, wordsFound: 6, target: 8, setbacks: 0, maxSetbacks: 3 })
      );
      expect(better.displayScore).toBeGreaterThanOrEqual(worse.displayScore);
    });

    it('breakdown parts sum to the displayScore', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 120, wordsFound: 4, target: 8, setbacks: 1 })
      );
      expect(r.participation + r.performance).toBe(r.displayScore);
    });
  });

  describe('robustness', () => {
    it('never divides by zero when target is 0', () => {
      const r = calculateForgivingDrillScore(base({ target: 0, wordsFound: 0 }));
      expect(Number.isFinite(r.displayScore)).toBe(true);
      expect(Number.isFinite(r.performanceScore)).toBe(true);
    });

    it('clamps performanceScore to 0..100', () => {
      const r = calculateForgivingDrillScore(
        base({ rawScore: 99999, wordsFound: 99, target: 8, setbacks: 0 })
      );
      expect(r.performanceScore).toBeLessThanOrEqual(100);
      expect(r.performanceScore).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('badgeForRatio', () => {
  it('maps the ratio bands to badges and never returns a falsy value', () => {
    expect(badgeForRatio(0)).toBe('bronze');
    expect(badgeForRatio(0.5)).toBe('silver');
    expect(badgeForRatio(0.7)).toBe('gold');
    expect(badgeForRatio(0.95)).toBe('platinum');
  });
});
