import { getSharedRedisClient } from '@/backend/redis/connection';
import { CONNECTIONS_MAX_SOLVE_XP } from '@/lib/education/recordXpPolicy';

/** Twenty best-case solves a day; a real student never gets near it. */
export const CONNECTIONS_DAILY_XP_CEILING = CONNECTIONS_MAX_SOLVE_XP * 20;

const TTL_SEC = 60 * 60 * 48;

/**
 * Spends `xp` from the user's budget for `day` in Redis (shared by every
 * instance) and returns how much of it fits under `ceiling`.
 */
export async function reserveDailyXp(
  userId: string,
  day: string,
  xp: number,
  ceiling: number,
): Promise<number | 'unavailable'> {
  const redis = getSharedRedisClient();
  if (!redis) return 'unavailable';
  try {
    const key = `edu-record-xp:${userId}:${day}`;
    const total = await redis.incrby(key, xp);
    if (total === xp) await redis.expire(key, TTL_SEC);
    const before = total - xp;
    return Math.max(0, Math.min(xp, ceiling - before));
  } catch {
    return 'unavailable';
  }
}
