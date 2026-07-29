import {
  GLOBAL_LEADERBOARD_TIERS,
  DAILY_LEADERBOARD_TIERS,
  LEADERBOARD_TIER_IDS,
  getGlobalLeaderboardTier,
  getDailyLeaderboardTier,
  getLeaderboardTierProgress,
  getNextTierThreshold,
} from '../leaderboardTiers';

describe('GLOBAL_LEADERBOARD_TIERS', () => {
  it('has 7 tiers in ascending score order', () => {
    expect(GLOBAL_LEADERBOARD_TIERS).toHaveLength(7);
    for (let i = 1; i < GLOBAL_LEADERBOARD_TIERS.length; i++) {
      expect(GLOBAL_LEADERBOARD_TIERS[i].minScore).toBeGreaterThan(
        GLOBAL_LEADERBOARD_TIERS[i - 1].minScore
      );
    }
  });

  it('covers all tier IDs', () => {
    const ids = GLOBAL_LEADERBOARD_TIERS.map((t) => t.id);
    for (const id of LEADERBOARD_TIER_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('top tier has maxScore of Infinity', () => {
    const last = GLOBAL_LEADERBOARD_TIERS[GLOBAL_LEADERBOARD_TIERS.length - 1];
    expect(last.maxScore).toBe(Infinity);
    expect(last.id).toBe('grandmaster');
  });

  it('has no gaps between tier score ranges', () => {
    for (let i = 1; i < GLOBAL_LEADERBOARD_TIERS.length; i++) {
      expect(GLOBAL_LEADERBOARD_TIERS[i].minScore).toBe(
        GLOBAL_LEADERBOARD_TIERS[i - 1].maxScore + 1
      );
    }
  });
});

describe('getGlobalLeaderboardTier', () => {
  it('returns stone for score 0', () => {
    expect(getGlobalLeaderboardTier(0).id).toBe('stone');
  });

  it('returns stone at its upper boundary', () => {
    const stone = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === 'stone')!;
    expect(getGlobalLeaderboardTier(stone.maxScore).id).toBe('stone');
  });

  it('returns bronze just above stone boundary', () => {
    const stone = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === 'stone')!;
    expect(getGlobalLeaderboardTier(stone.maxScore + 1).id).toBe('bronze');
  });

  it('returns grandmaster for very high scores', () => {
    expect(getGlobalLeaderboardTier(999_999_999).id).toBe('grandmaster');
  });

  it('returns grandmaster at its minScore boundary', () => {
    const gm = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === 'grandmaster')!;
    expect(getGlobalLeaderboardTier(gm.minScore).id).toBe('grandmaster');
  });

  it('handles negative scores as stone', () => {
    expect(getGlobalLeaderboardTier(-100).id).toBe('stone');
  });

  it('returns correct tier for each boundary', () => {
    const expectedBoundaries: [number, string][] = [
      [0, 'stone'],
      [499, 'stone'],
      [500, 'bronze'],
      [2499, 'bronze'],
      [2500, 'silver'],
      [9999, 'silver'],
      [10000, 'gold'],
      [29999, 'gold'],
      [30000, 'platinum'],
      [79999, 'platinum'],
      [80000, 'diamond'],
      [199999, 'diamond'],
      [200000, 'grandmaster'],
    ];
    for (const [score, expectedId] of expectedBoundaries) {
      expect(getGlobalLeaderboardTier(score).id).toBe(expectedId);
    }
  });
});

describe('getDailyLeaderboardTier', () => {
  it('returns stone for score 0', () => {
    expect(getDailyLeaderboardTier(0).id).toBe('stone');
  });

  it('returns grandmaster for score 1800+', () => {
    expect(getDailyLeaderboardTier(1800).id).toBe('grandmaster');
    expect(getDailyLeaderboardTier(5000).id).toBe('grandmaster');
  });

  it('returns correct tier for each daily boundary', () => {
    const expectedBoundaries: [number, string][] = [
      [0, 'stone'],
      [99, 'stone'],
      [100, 'bronze'],
      [249, 'bronze'],
      [250, 'silver'],
      [499, 'silver'],
      [500, 'gold'],
      [799, 'gold'],
      [800, 'platinum'],
      [1199, 'platinum'],
      [1200, 'diamond'],
      [1799, 'diamond'],
      [1800, 'grandmaster'],
    ];
    for (const [score, expectedId] of expectedBoundaries) {
      expect(getDailyLeaderboardTier(score).id).toBe(expectedId);
    }
  });
});

describe('getLeaderboardTierProgress', () => {
  it('returns 0 for min score of a tier', () => {
    const result = getLeaderboardTierProgress(0, GLOBAL_LEADERBOARD_TIERS);
    expect(result).toBe(0);
  });

  it('returns 1 for grandmaster (top tier)', () => {
    const result = getLeaderboardTierProgress(999_999, GLOBAL_LEADERBOARD_TIERS);
    expect(result).toBe(1);
  });

  it('returns value between 0 and 1 for mid-tier scores', () => {
    // Bronze: 500-2499. Score 1499 is midpoint.
    const result = getLeaderboardTierProgress(1499, GLOBAL_LEADERBOARD_TIERS);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('never returns more than 1', () => {
    const result = getLeaderboardTierProgress(79999, GLOBAL_LEADERBOARD_TIERS);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('getNextTierThreshold', () => {
  it('returns the minScore of the next tier', () => {
    // Stone: 0-499 → next is Bronze at 500
    expect(getNextTierThreshold(0, GLOBAL_LEADERBOARD_TIERS)).toBe(500);
  });

  it('returns null when already at grandmaster', () => {
    expect(getNextTierThreshold(250000, GLOBAL_LEADERBOARD_TIERS)).toBeNull();
  });

  it('returns correct next tier threshold for gold', () => {
    // Gold: 10000-29999 → next is Platinum at 30000
    expect(getNextTierThreshold(15000, GLOBAL_LEADERBOARD_TIERS)).toBe(30000);
  });
});
