import { getCacheClient } from '@/backend/cache/redisCache';
import { KEYS } from '@/backend/redis/keys';
import logger from '@/utils/logger';

/**
 * Is this code a live non-classroom room? Reads the hash `gameStateManager` persists for
 * every room (deleted when the room is torn down). False on any failure, never throws.
 */
export async function isLiveArcadeRoom(code: string): Promise<boolean> {
  try {
    const redis = getCacheClient();
    if (!redis) return false;
    const [gameState, isClassroom] = await redis.hmget(KEYS.game(code), 'gameState', 'isClassroom');
    return !!gameState && isClassroom !== 'true';
  } catch (err) {
    logger.error('isLiveArcadeRoom failed:', err);
    return false;
  }
}
