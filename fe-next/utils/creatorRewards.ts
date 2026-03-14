/**
 * Creator Rewards
 *
 * Handles coin rewards for UGC creators when their boards/packs are played,
 * rated highly, or featured. Includes daily caps and stats tracking.
 */

import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
} from '@/utils/storageHelpers';
import { addCoins } from '@/utils/coinManager';

const CREATOR_STATS_KEY = 'lexiclash_creator_stats';

// Coin reward constants for creator actions
export const CREATOR_REWARDS = {
  BOARD_PLAYED: 5,
  BOARD_PLAYED_DAILY_CAP: 50,
  BOARD_RATED_HIGH: 10,
  BOARD_FEATURED: 500,
  PACK_PLAYED: 3,
  PACK_PLAYED_DAILY_CAP: 30,
  BOARD_CREATED_XP: 20,
  BOARD_100_PLAYS_XP: 50,
} as const;

type RewardType = 'BOARD_PLAYED' | 'BOARD_RATED_HIGH' | 'BOARD_FEATURED' | 'PACK_PLAYED';
type StatsEvent = 'BOARD_CREATED' | 'BOARD_PLAYED' | 'BOARD_RATED';

// Map reward types to their coin values
const REWARD_AMOUNTS: Record<RewardType, number> = {
  BOARD_PLAYED: CREATOR_REWARDS.BOARD_PLAYED,
  BOARD_RATED_HIGH: CREATOR_REWARDS.BOARD_RATED_HIGH,
  BOARD_FEATURED: CREATOR_REWARDS.BOARD_FEATURED,
  PACK_PLAYED: CREATOR_REWARDS.PACK_PLAYED,
};

// Daily caps per reward type (null = no cap)
const DAILY_CAPS: Partial<Record<RewardType, number>> = {
  BOARD_PLAYED: CREATOR_REWARDS.BOARD_PLAYED_DAILY_CAP,
  PACK_PLAYED: CREATOR_REWARDS.PACK_PLAYED_DAILY_CAP,
};

export interface CreatorStats {
  boardsCreated: number;
  totalPlays: number;
  totalRatings: number;
  averageRating: number;
}

interface DailyCounter {
  count: number;
}

function getTodayKey(type: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `lexiclash_creator_rewards_${type}_${today}`;
}

function getDailyCount(type: string): number {
  if (typeof window === 'undefined') return 0;
  const key = getTodayKey(type);
  const data = getJsonFromLocalStorage<DailyCounter | null>(key, null);
  return data?.count ?? 0;
}

function incrementDailyCount(type: string): void {
  if (typeof window === 'undefined') return;
  const key = getTodayKey(type);
  const current = getDailyCount(type);
  saveJsonToLocalStorage(key, { count: current + 1 });
}

/**
 * Get coin amount for a reward type
 */
export function calculateCreatorReward(type: RewardType): number {
  return REWARD_AMOUNTS[type] ?? 0;
}

/**
 * Check if daily cap reached for a reward type
 */
export function isCreatorRewardCapped(type: RewardType): boolean {
  const cap = DAILY_CAPS[type];
  if (!cap) return false;
  return getDailyCount(type) >= cap;
}

/**
 * Award creator coins, respecting daily caps
 * Returns null if capped or SSR
 */
export function awardCreatorCoins(
  type: RewardType,
  details?: Record<string, number | string>
): { awarded: number } | null {
  if (typeof window === 'undefined') return null;
  if (isCreatorRewardCapped(type)) return null;

  const amount = calculateCreatorReward(type);
  if (amount <= 0) return null;

  addCoins(amount, `Creator Reward: ${type}`, details);
  incrementDailyCount(type);

  return { awarded: amount };
}

/**
 * Get creator stats from localStorage
 */
export function getCreatorStats(): CreatorStats {
  if (typeof window === 'undefined') {
    return { boardsCreated: 0, totalPlays: 0, totalRatings: 0, averageRating: 0 };
  }
  return getJsonFromLocalStorage<CreatorStats>(CREATOR_STATS_KEY, {
    boardsCreated: 0,
    totalPlays: 0,
    totalRatings: 0,
    averageRating: 0,
  });
}

/**
 * Update creator stats in localStorage
 */
export function updateCreatorStats(event: StatsEvent, data: { rating?: number }): void {
  if (typeof window === 'undefined') return;

  const stats = getCreatorStats();

  switch (event) {
    case 'BOARD_CREATED':
      stats.boardsCreated += 1;
      break;
    case 'BOARD_PLAYED':
      stats.totalPlays += 1;
      break;
    case 'BOARD_RATED': {
      const newTotal = stats.totalRatings + 1;
      const rating = data.rating ?? 0;
      stats.averageRating =
        (stats.averageRating * stats.totalRatings + rating) / newTotal;
      stats.totalRatings = newTotal;
      break;
    }
  }

  saveJsonToLocalStorage(CREATOR_STATS_KEY, stats);
}
