/**
 * Redis-backed cache for admin API endpoints.
 * Wraps expensive queries with TTL-based caching to reduce DB load.
 */

import { getRedisClient, isRedisAvailable } from '../../redis/connection';

import logger from '../../utils/logger';

/**
 * Cache wrapper: returns cached value if available, otherwise calls fetcher and caches result.
 * Falls back to fetcher silently if Redis is unavailable.
 */
export async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const redis = getRedisClient();

  if (redis && isRedisAvailable()) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Redis read failed — fall through to fetcher
    }
  }

  const result = await fetcher();

  // Cache in background — don't block response
  if (redis && isRedisAvailable()) {
    redis.setex(key, ttlSeconds, JSON.stringify(result)).catch((err: Error) => {
      logger.debug('ADMIN_CACHE', `Cache write failed for ${key}: ${err.message}`);
    });
  }

  return result;
}

/**
 * Invalidate cache keys matching a prefix pattern.
 * Uses SCAN (not KEYS) to avoid blocking Redis.
 */
export async function invalidateAdminCache(prefix: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return 0;

  let deleted = 0;
  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    for await (const keys of stream) {
      if ((keys as string[]).length > 0) {
        await redis.del(...(keys as string[]));
        deleted += (keys as string[]).length;
      }
    }
  } catch (err) {
    logger.debug('ADMIN_CACHE', `Cache invalidation failed for ${prefix}: ${(err as Error).message}`);
  }
  return deleted;
}
