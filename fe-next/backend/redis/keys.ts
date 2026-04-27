// keys.ts - Redis key naming helpers

import { REDIS_PREFIX, REDIS_VERSION } from './config';

/**
 * Redis key generators - ensures consistent namespacing
 */
export const KEYS = {
  game: (gameCode: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:game:${gameCode}`,

  tournament: (id: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:tournament:${id}`,

  wordApproval: (lang: string, word: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:word:${lang}:${word}`,

  leaderboardTop: (seasonId?: number): string =>
    seasonId !== undefined
      ? `${REDIS_PREFIX}:${REDIS_VERSION}:lb:top100:s${seasonId}`
      : `${REDIS_PREFIX}:${REDIS_VERSION}:lb:top100`,

  leaderboardUser: (userId: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:${userId}`,

  dailyPuzzle: (date: string, language: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:daily:puzzle:${language}:${date}`,

  dailyLeaderboard: (date: string, language: string, limit: number): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:daily:lb:${language}:${date}:${limit}`,

  userProfile: (userId: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:profile:${userId}`,

  friendshipStatus: (userA: string, userB: string): string => {
    // Sort user IDs to ensure consistent key regardless of query order
    const [id1, id2] = [userA, userB].sort();
    return `${REDIS_PREFIX}:${REDIS_VERSION}:friends:${id1}:${id2}`;
  },
};

/**
 * Key patterns for SCAN operations
 */
export const KEY_PATTERNS = {
  games: `${REDIS_PREFIX}:${REDIS_VERSION}:game:*`,
  tournaments: `${REDIS_PREFIX}:${REDIS_VERSION}:tournament:*`,
  wordApprovals: (lang: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:word:${lang}:*`,
  leaderboardUsers: `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:*`,
};
