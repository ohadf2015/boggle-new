// dailyPuzzle.ts - Daily puzzle and leaderboard caching

import { circuitBreaker } from './circuitBreaker';
import { getTTLWithJitter, TTL_CONFIG } from './config';
import { getRedisClient, isRedisAvailable } from './connection';
import { KEYS } from './keys';

const logger = require('../utils/logger');

export async function getCachedDailyPuzzle(date: string, language: string): Promise<unknown | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.get(KEYS.dailyPuzzle(date, language)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached daily puzzle: ${err.message}`);
    return null;
  }
}

export async function cacheDailyPuzzle(
  date: string,
  language: string,
  puzzle: unknown
): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() =>
      client.setex(
        KEYS.dailyPuzzle(date, language),
        getTTLWithJitter(TTL_CONFIG.DAILY_PUZZLE),
        JSON.stringify(puzzle)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching daily puzzle: ${err.message}`);
  }
}

export async function getCachedDailyLeaderboard(
  date: string,
  language: string,
  limit: number
): Promise<unknown | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() =>
      client.get(KEYS.dailyLeaderboard(date, language, limit))
    );
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached daily leaderboard: ${err.message}`);
    return null;
  }
}

export async function cacheDailyLeaderboard(
  date: string,
  language: string,
  limit: number,
  leaderboard: unknown
): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() =>
      client.setex(
        KEYS.dailyLeaderboard(date, language, limit),
        getTTLWithJitter(TTL_CONFIG.DAILY_LEADERBOARD),
        JSON.stringify(leaderboard)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching daily leaderboard: ${err.message}`);
  }
}
