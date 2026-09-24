import { getRedisClient, isRedisAvailable } from '@/backend/redis/connection';

export type ClaimResult = 'claimed' | 'taken' | 'unavailable';

/**
 * Durable "only once" for money paths whose input is replayable client state
 * (an adventure run token, a guest estate). Redis SET NX: survives a restart
 * and is shared by every instance, unlike an in-process Map. 'unavailable' is
 * NOT a pass — callers fail closed (withhold the payout) and say so.
 */
export async function claimOnce(key: string, ttlSec = 60 * 60 * 24 * 120): Promise<ClaimResult> {
  const redis = isRedisAvailable() ? getRedisClient() : null;
  if (!redis) return 'unavailable';
  try {
    return (await redis.set(`once:${key}`, '1', 'EX', ttlSec, 'NX')) === 'OK' ? 'claimed' : 'taken';
  } catch {
    return 'unavailable';
  }
}
