// leaderboard.ts - Leaderboard caching operations

import { circuitBreaker } from './circuitBreaker';
import { getTTLWithJitter, MAX_SCAN_ITERATIONS, SCAN_COUNT, TTL_CONFIG } from './config';
import { getRedisClient, isRedisAvailable } from './connection';
import { KEY_PATTERNS, KEYS } from './keys';

import logger from '../utils/logger';

export async function getCachedLeaderboardTop100(seasonId?: number): Promise<unknown[] | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.get(KEYS.leaderboardTop(seasonId)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached leaderboard: ${err.message}`);
    return null;
  }
}

export async function cacheLeaderboardTop100(leaderboard: unknown[], seasonId?: number): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() =>
      client.setex(
        KEYS.leaderboardTop(seasonId),
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_TOP),
        JSON.stringify(leaderboard)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching leaderboard: ${err.message}`);
  }
}

export async function getCachedUserRank(userId: string): Promise<unknown | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.get(KEYS.leaderboardUser(userId)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached user rank: ${err.message}`);
    return null;
  }
}

export async function cacheUserRank(userId: string, rankData: unknown): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() =>
      client.setex(
        KEYS.leaderboardUser(userId),
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_USER),
        JSON.stringify(rankData)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching user rank: ${err.message}`);
  }
}

/**
 * Invalidate leaderboard caches for specific users only.
 * This is much more efficient than bulk invalidation - it only removes
 * caches for users who actually played, preventing database thrashing.
 *
 * @param userIds - Array of user IDs whose caches should be invalidated
 */
export async function invalidateUserLeaderboardCaches(userIds: string[]): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient() || userIds.length === 0) {
    return;
  }

  try {
    const client = getRedisClient()!;
    const pipeline = client.pipeline();

    // Delete top 100 cache (always needed as rankings may have changed)
    pipeline.del(KEYS.leaderboardTop());

    // Delete only the specific user caches that need invalidation
    for (const userId of userIds) {
      pipeline.del(KEYS.leaderboardUser(userId));
    }

    await circuitBreaker.execute(() => pipeline.exec());
    logger.debug('REDIS', `Leaderboard caches invalidated for ${userIds.length} users`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error invalidating user leaderboard caches: ${err.message}`);
  }
}

/**
 * @deprecated Use invalidateUserLeaderboardCaches(userIds) for targeted invalidation.
 * This function scans and deletes ALL user rank caches which causes database thrashing.
 * Only use this for admin operations or full cache reset scenarios.
 */
export async function invalidateLeaderboardCaches(): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;

    // Delete top 100 cache
    await circuitBreaker.execute(() => client.del(KEYS.leaderboardTop()));

    // Delete all user rank caches using SCAN
    let cursor = '0';
    let iterations = 0;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) break;

      const result = await client.scan(cursor, 'MATCH', KEY_PATTERNS.leaderboardUsers, 'COUNT', SCAN_COUNT);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');

    logger.debug('REDIS', 'All leaderboard caches invalidated (bulk)');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error invalidating leaderboard caches: ${err.message}`);
  }
}
