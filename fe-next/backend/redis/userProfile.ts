// userProfile.ts - User profile caching operations

import { circuitBreaker } from './circuitBreaker';
import { getTTLWithJitter, TTL_CONFIG } from './config';
import { getRedisClient, isRedisAvailable } from './connection';
import { KEYS } from './keys';

import logger from '../utils/logger';

/**
 * Cached user profile data for display purposes.
 * This is a subset of the full profile - only what's needed for display.
 */
export interface CachedUserProfile {
  userId: string;
  username: string;
  displayName?: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarImage?: string;
  lastSeenAt?: string;
}

/**
 * Get cached user profile by ID.
 * Returns null if not cached or Redis unavailable (fallback to DB).
 */
export async function getCachedUserProfile(userId: string): Promise<CachedUserProfile | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.get(KEYS.userProfile(userId)));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached user profile: ${err.message}`);
    return null;
  }
}

/**
 * Get multiple cached user profiles by IDs.
 * Returns a map of userId -> profile (missing entries not in cache).
 */
export async function getCachedUserProfiles(userIds: string[]): Promise<Map<string, CachedUserProfile>> {
  const result = new Map<string, CachedUserProfile>();

  if (!isRedisAvailable() || !getRedisClient() || userIds.length === 0) {
    return result;
  }

  try {
    const client = getRedisClient()!;
    const keys = userIds.map(id => KEYS.userProfile(id));
    const values = await circuitBreaker.execute(() => client.mget(...keys));

    if (values) {
      for (let i = 0; i < userIds.length; i++) {
        const data = values[i];
        if (data) {
          try {
            result.set(userIds[i], JSON.parse(data));
          } catch {
            // Skip malformed data
          }
        }
      }
    }

    logger.debug('REDIS', `Profile cache hit for ${result.size}/${userIds.length} users`);
    return result;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting cached user profiles: ${err.message}`);
    return result;
  }
}

/**
 * Cache a user profile.
 */
export async function cacheUserProfile(profile: CachedUserProfile): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() =>
      client.setex(
        KEYS.userProfile(profile.userId),
        getTTLWithJitter(TTL_CONFIG.USER_PROFILE),
        JSON.stringify(profile)
      )
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching user profile: ${err.message}`);
  }
}

/**
 * Cache multiple user profiles in a single pipeline operation.
 */
export async function cacheUserProfiles(profiles: CachedUserProfile[]): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient() || profiles.length === 0) {
    return;
  }

  try {
    const client = getRedisClient()!;
    const pipeline = client.pipeline();
    const ttl = getTTLWithJitter(TTL_CONFIG.USER_PROFILE);

    for (const profile of profiles) {
      pipeline.setex(
        KEYS.userProfile(profile.userId),
        ttl,
        JSON.stringify(profile)
      );
    }

    await circuitBreaker.execute(() => pipeline.exec());
    logger.debug('REDIS', `Cached ${profiles.length} user profiles`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error caching user profiles: ${err.message}`);
  }
}

/**
 * Invalidate a user's cached profile.
 * Call this when a user updates their profile.
 */
export async function invalidateUserProfile(userId: string): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const client = getRedisClient()!;
    await circuitBreaker.execute(() => client.del(KEYS.userProfile(userId)));
    logger.debug('REDIS', `Invalidated profile cache for user ${userId}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error invalidating user profile: ${err.message}`);
  }
}

/**
 * Invalidate multiple user profiles.
 */
export async function invalidateUserProfiles(userIds: string[]): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient() || userIds.length === 0) {
    return;
  }

  try {
    const client = getRedisClient()!;
    const keys = userIds.map(id => KEYS.userProfile(id));
    await circuitBreaker.execute(() => client.del(...keys));
    logger.debug('REDIS', `Invalidated profile cache for ${userIds.length} users`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error invalidating user profiles: ${err.message}`);
  }
}
