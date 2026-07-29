/**
 * Cross-replica cache invalidation via Redis pub/sub.
 *
 * When REDIS_PRIMARY=true, each replica maintains a local LRU cache of game
 * state. After any write, the writing replica publishes the game code on the
 * CACHE_INVALIDATE_CHANNEL. All other replicas receive the message and evict
 * that key from their local cache, forcing a fresh Redis read on next access.
 */

import { getRedisClient, isRedisAvailable } from './connection';
import logger from '../utils/logger';

const CACHE_INVALIDATE_CHANNEL = 'lexiclash:cache:invalidate';

type EvictCallback = (gameCode: string) => void;

let subscriber: ReturnType<typeof getRedisClient> | null = null;
let onEvict: EvictCallback | null = null;

/**
 * Start listening for cache invalidation messages.
 * Call once at server startup when REDIS_PRIMARY is enabled.
 * @param evictFn - callback to evict a game code from the local LRU cache
 */
export async function startCacheInvalidationListener(evictFn: EvictCallback): Promise<boolean> {
  if (!isRedisAvailable() || !getRedisClient()) return false;

  try {
    // Dedicated subscriber connection (subscribe mode blocks the client)
    subscriber = getRedisClient()!.duplicate();
    onEvict = evictFn;

    subscriber.on('error', (err) => {
      logger.warn('CACHE_INVALIDATION', `Subscriber error: ${err.message}`);
    });

    await subscriber.subscribe(CACHE_INVALIDATE_CHANNEL);

    subscriber.on('message', (_channel: string, gameCode: string) => {
      if (onEvict) onEvict(gameCode);
    });

    logger.info('CACHE_INVALIDATION', 'Listening for cross-replica cache invalidation');
    return true;
  } catch (err) {
    logger.warn('CACHE_INVALIDATION', `Failed to start listener: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Publish a cache invalidation event for a game code.
 * Non-blocking — fire-and-forget. Failures are logged but don't propagate.
 */
export function publishCacheInvalidation(gameCode: string): void {
  if (!isRedisAvailable()) return;

  const client = getRedisClient();
  if (!client) return;

  client.publish(CACHE_INVALIDATE_CHANNEL, gameCode).catch((err) => {
    logger.debug('CACHE_INVALIDATION', `Publish failed for ${gameCode}: ${(err as Error).message}`);
  });
}

/**
 * Clean up the subscriber connection on shutdown.
 */
export async function stopCacheInvalidationListener(): Promise<void> {
  if (subscriber) {
    try {
      await subscriber.unsubscribe(CACHE_INVALIDATE_CHANNEL);
      await subscriber.quit();
    } catch {
      // best effort
    }
    subscriber = null;
    onEvict = null;
  }
}
