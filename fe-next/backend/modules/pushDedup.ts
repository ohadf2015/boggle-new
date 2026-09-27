/**
 * Push notification de-duplication helpers.
 *
 * Backed by Redis SET NX EX so concurrent senders see a single window.
 * Fail-open on any Redis error — losing a dedup decision is preferable to
 * losing a notification entirely.
 */

import { getRedisClient } from '../redis/connection';
import logger from '../utils/logger';

const DM_COALESCE_WINDOW_SEC = 60;

/**
 * Returns true if a direct-message push should fire for this (recipient, sender)
 * pair. First call within the coalesce window returns true and claims the slot;
 * subsequent calls return false until the window elapses.
 *
 * Window resets only after expiry — a long burst of messages still produces
 * exactly one push per minute, which matches notification policy.
 */
export async function shouldSendDirectMessagePush(
  recipientUserId: string,
  senderUserId: string,
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) return true;

    const key = `push:dm:${recipientUserId}:${senderUserId}`;
    // SET NX EX returns 'OK' if claimed (first sender wins), null if already held.
    const result = await redis.set(key, '1', 'EX', DM_COALESCE_WINDOW_SEC, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.warn('PUSH_DEDUP', 'shouldSendDirectMessagePush errored, allowing send', {
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

/** Test-only: drop the dedup key so suites can re-arm without waiting 60s. */
export async function clearDirectMessagePushDedup(
  recipientUserId: string,
  senderUserId: string,
): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(`push:dm:${recipientUserId}:${senderUserId}`);
  } catch {
    // best-effort cleanup
  }
}
