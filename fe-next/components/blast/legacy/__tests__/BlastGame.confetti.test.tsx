/**
 * Tests for board-complete star calculation and confetti celebration.
 * TDD: written before implementation.
 */
import { calculateEarnedStars } from '../utils/blastStarCalculator';

describe('calculateEarnedStars', () => {
  it('returns 3 stars when clearPct is exactly 80%', () => {
    expect(calculateEarnedStars(80, 100)).toBe(3);
  });

  it('returns 3 stars when clearPct is above 80% (e.g. 90%)', () => {
    expect(calculateEarnedStars(90, 100)).toBe(3);
  });

  it('returns 3 stars when board is 100% cleared', () => {
    expect(calculateEarnedStars(100, 100)).toBe(3);
  });

  it('returns 2 stars when clearPct is exactly 50%', () => {
    expect(calculateEarnedStars(50, 100)).toBe(2);
  });

  it('returns 2 stars when clearPct is between 50% and 79%', () => {
    expect(calculateEarnedStars(65, 100)).toBe(2);
  });

  it('returns 2 stars when clearPct is 79%', () => {
    expect(calculateEarnedStars(79, 100)).toBe(2);
  });

  it('returns 1 star when clearPct is below 50%', () => {
    expect(calculateEarnedStars(49, 100)).toBe(1);
  });

  it('returns 1 star when clearPct is 0%', () => {
    expect(calculateEarnedStars(0, 100)).toBe(1);
  });

  it('handles tilesCleared and totalTiles directly', () => {
    // 8 of 10 = 80% → 3 stars
    expect(calculateEarnedStars(8, 10)).toBe(3);
    // 5 of 10 = 50% → 2 stars
    expect(calculateEarnedStars(5, 10)).toBe(2);
    // 4 of 10 = 40% → 1 star
    expect(calculateEarnedStars(4, 10)).toBe(1);
  });

  it('returns 1 star when totalTiles is 0 (edge case)', () => {
    expect(calculateEarnedStars(0, 0)).toBe(1);
  });

  describe('with allObjectivesComplete flag', () => {
    it('caps at 2 stars when 80%+ cleared but objectives incomplete', () => {
      expect(calculateEarnedStars(80, 100, false)).toBe(2);
      expect(calculateEarnedStars(95, 100, false)).toBe(2);
    });

    it('keeps 3 stars when 80%+ cleared AND all objectives complete', () => {
      expect(calculateEarnedStars(80, 100, true)).toBe(3);
      expect(calculateEarnedStars(100, 100, true)).toBe(3);
    });

    it('keeps 1 star at low clear regardless of flag', () => {
      expect(calculateEarnedStars(40, 100, true)).toBe(1);
      expect(calculateEarnedStars(40, 100, false)).toBe(1);
    });

    it('does not promote: completing all objectives at 50% clear stays 2 stars', () => {
      expect(calculateEarnedStars(50, 100, true)).toBe(2);
    });

    it('flag undefined preserves legacy behavior', () => {
      expect(calculateEarnedStars(85, 100)).toBe(3);
      expect(calculateEarnedStars(85, 100, undefined)).toBe(3);
    });
  });
});
