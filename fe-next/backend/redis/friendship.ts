// friendship.ts - Friendship status caching operations

import { circuitBreaker } from './circuitBreaker';
import { getTTLWithJitter, TTL_CONFIG } from './config';
import { getRedisClient, isRedisAvailable } from './connection';
import { KEYS } from './keys';

import logger from '../utils/logger';

/**
 * Get cached friendship status between two users.
 * Returns null if not cached (fallback to DB), true if friends, false if not friends.
 */
export async function getCachedFriendshipStatus(userA: string, userB: string): Promise<boolean | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.get(KEYS.friendshipStatus(userA, userB)));

    if (data === null) {
      return null; // Not cached
    }

    return data === 'true';
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached friendship status: ${err.message}`);
    return null;
  }
}

/**
 * Cache friendship status between two users.
 */
export async function cacheFriendshipStatus(userA: string, userB: string, areFriends: boolean): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() =>
      client.setex(
        KEYS.friendshipStatus(userA, userB),
        getTTLWithJitter(TTL_CONFIG.FRIENDSHIP_STATUS),
        areFriends ? 'true' : 'false'
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching friendship status: ${err.message}`);
  }
}

/**
 * Invalidate friendship status between two users.
 * Call this when a friendship is created, accepted, declined, or removed.
 */
export async function invalidateFriendshipStatus(userA: string, userB: string): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() => client.del(KEYS.friendshipStatus(userA, userB)));
    logger.debug('REDIS', `Invalidated friendship cache for ${userA} <-> ${userB}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error invalidating friendship status: ${err.message}`);
  }
}
