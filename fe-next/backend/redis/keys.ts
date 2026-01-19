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

  leaderboardTop: (): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:lb:top100`,

  leaderboardUser: (userId: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:lb:user:${userId}`,

  dailyPuzzle: (date: string, language: string): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:daily:puzzle:${language}:${date}`,

  dailyLeaderboard: (date: string, language: string, limit: number): string =>
    `${REDIS_PREFIX}:${REDIS_VERSION}:daily:lb:${language}:${date}:${limit}`,
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
