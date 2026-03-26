/**
 * Creator Rewards Tests (TDD — RED phase)
 *
 * Tests for the UGC creator rewards system:
 * coin rewards for board/pack plays, ratings, featuring,
 * daily caps, stats tracking.
 */

import {
  CREATOR_REWARDS,
  calculateCreatorReward,
  isCreatorRewardCapped,
  awardCreatorCoins,
  getCreatorStats,
  updateCreatorStats,
} from '../creatorRewards';
import * as coinManager from '../coinManager';

// Mock coinManager
vi.mock('../coinManager', () => ({
  addCoins: vi.fn().mockReturnValue(100),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('CREATOR_REWARDS constants', () => {
  it('has correct coin values', () => {
    expect(CREATOR_REWARDS.BOARD_PLAYED).toBe(5);
    expect(CREATOR_REWARDS.BOARD_PLAYED_DAILY_CAP).toBe(50);
    expect(CREATOR_REWARDS.BOARD_RATED_HIGH).toBe(10);
    expect(CREATOR_REWARDS.BOARD_FEATURED).toBe(500);
    expect(CREATOR_REWARDS.PACK_PLAYED).toBe(3);
    expect(CREATOR_REWARDS.PACK_PLAYED_DAILY_CAP).toBe(30);
    expect(CREATOR_REWARDS.BOARD_CREATED_XP).toBe(20);
    expect(CREATOR_REWARDS.BOARD_100_PLAYS_XP).toBe(50);
  });
});

describe('calculateCreatorReward', () => {
  it('returns correct amount for BOARD_PLAYED', () => {
    expect(calculateCreatorReward('BOARD_PLAYED')).toBe(5);
  });

  it('returns correct amount for BOARD_RATED_HIGH', () => {
    expect(calculateCreatorReward('BOARD_RATED_HIGH')).toBe(10);
  });

  it('returns correct amount for BOARD_FEATURED', () => {
    expect(calculateCreatorReward('BOARD_FEATURED')).toBe(500);
  });

  it('returns correct amount for PACK_PLAYED', () => {
    expect(calculateCreatorReward('PACK_PLAYED')).toBe(3);
  });

  it('returns 0 for unknown type', () => {
    expect(calculateCreatorReward('UNKNOWN' as never)).toBe(0);
  });
});

describe('isCreatorRewardCapped', () => {
  it('returns false when no rewards earned today', () => {
    expect(isCreatorRewardCapped('BOARD_PLAYED')).toBe(false);
  });

  it('returns true when daily cap reached for BOARD_PLAYED', () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `lexiclash_creator_rewards_BOARD_PLAYED_${today}`;
    localStorageMock.setItem(key, JSON.stringify({ count: 50 }));
    expect(isCreatorRewardCapped('BOARD_PLAYED')).toBe(true);
  });

  it('returns true when daily cap reached for PACK_PLAYED', () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `lexiclash_creator_rewards_PACK_PLAYED_${today}`;
    localStorageMock.setItem(key, JSON.stringify({ count: 30 }));
    expect(isCreatorRewardCapped('PACK_PLAYED')).toBe(true);
  });

  it('returns false for types without daily caps (BOARD_FEATURED)', () => {
    expect(isCreatorRewardCapped('BOARD_FEATURED')).toBe(false);
  });

  it('returns false when under the cap', () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `lexiclash_creator_rewards_BOARD_PLAYED_${today}`;
    localStorageMock.setItem(key, JSON.stringify({ count: 10 }));
    expect(isCreatorRewardCapped('BOARD_PLAYED')).toBe(false);
  });
});

describe('awardCreatorCoins', () => {
  it('calls addCoins with correct amount', () => {
    const result = awardCreatorCoins('BOARD_PLAYED', { boardId: 'abc' });
    expect(coinManager.addCoins).toHaveBeenCalledWith(5, 'Creator Reward: BOARD_PLAYED', { boardId: 'abc' });
    expect(result).not.toBeNull();
    expect(result!.awarded).toBe(5);
  });

  it('returns null when capped', () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `lexiclash_creator_rewards_BOARD_PLAYED_${today}`;
    localStorageMock.setItem(key, JSON.stringify({ count: 50 }));

    const result = awardCreatorCoins('BOARD_PLAYED', { boardId: 'abc' });
    expect(result).toBeNull();
    expect(coinManager.addCoins).not.toHaveBeenCalled();
  });

  it('increments daily counter', () => {
    awardCreatorCoins('BOARD_PLAYED', { boardId: 'abc' });
    const today = new Date().toISOString().split('T')[0];
    const key = `lexiclash_creator_rewards_BOARD_PLAYED_${today}`;
    const stored = JSON.parse(localStorageMock.getItem(key)!);
    expect(stored.count).toBe(1);
  });

  it('awards BOARD_FEATURED without cap check', () => {
    const result = awardCreatorCoins('BOARD_FEATURED', { boardId: 'xyz' });
    expect(result).not.toBeNull();
    expect(result!.awarded).toBe(500);
  });
});

describe('getCreatorStats', () => {
  it('returns default stats when none stored', () => {
    const stats = getCreatorStats();
    expect(stats).toEqual({
      boardsCreated: 0,
      totalPlays: 0,
      totalRatings: 0,
      averageRating: 0,
    });
  });

  it('returns stored stats', () => {
    localStorageMock.setItem(
      'lexiclash_creator_stats',
      JSON.stringify({ boardsCreated: 5, totalPlays: 100, totalRatings: 20, averageRating: 4.2 })
    );
    const stats = getCreatorStats();
    expect(stats.boardsCreated).toBe(5);
    expect(stats.totalPlays).toBe(100);
    expect(stats.averageRating).toBe(4.2);
  });
});

describe('updateCreatorStats', () => {
  it('increments boardsCreated on BOARD_CREATED', () => {
    updateCreatorStats('BOARD_CREATED', {});
    const stats = getCreatorStats();
    expect(stats.boardsCreated).toBe(1);
  });

  it('increments totalPlays on BOARD_PLAYED', () => {
    updateCreatorStats('BOARD_PLAYED', {});
    updateCreatorStats('BOARD_PLAYED', {});
    const stats = getCreatorStats();
    expect(stats.totalPlays).toBe(2);
  });

  it('updates rating average on BOARD_RATED', () => {
    updateCreatorStats('BOARD_RATED', { rating: 5 });
    updateCreatorStats('BOARD_RATED', { rating: 3 });
    const stats = getCreatorStats();
    expect(stats.totalRatings).toBe(2);
    expect(stats.averageRating).toBe(4);
  });
});
