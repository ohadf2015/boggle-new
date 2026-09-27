/**
 * Grace Period Lock Service
 *
 * Provides distributed locking for word submissions during the grace period.
 * This prevents race conditions when multiple server instances process
 * late word submissions after the game has ended.
 */

import { randomUUID } from 'crypto';
import { LOCK_PREFIX } from '../redis/config';
import { acquireGameLock, releaseGameLock } from '../redis/locking';
import { GRACE_PERIOD_LOCK_TTL_MS } from '../utils/graceWindow';
import logger from '../utils/logger';

// Grace period lock specific configuration. TTL is derived from the shared
// grace-window constant so it always outlives the submit grace period (see
// graceWindow.ts) — they previously drifted (lock 2s, grace 1.5s, hardcoded).
const GRACE_PERIOD_LOCK_TTL = GRACE_PERIOD_LOCK_TTL_MS;
const GRACE_PERIOD_LOCK_PREFIX = `${LOCK_PREFIX}:graceperiod`;

/**
 * Acquire a lock for grace period word submission.
 * Lock is per-player so different players can submit simultaneously,
 * while preventing the same player from double-submitting.
 *
 * @param gameCode - The game code
 * @param username - Optional player username for per-player locking
 * @returns Lock ID if acquired, null if failed
 */
export async function acquireGracePeriodLock(gameCode: string, username?: string): Promise<string | null> {
  const lockId = randomUUID();

  // Per-player key allows parallel grace submissions from different players
  const lockKey = username
    ? `graceperiod:${gameCode}:${username}`
    : `graceperiod:${gameCode}`;

  const acquired = await acquireGameLock(
    lockKey,
    lockId,
    GRACE_PERIOD_LOCK_TTL
  );

  if (acquired) {
    logger.debug('GRACE_LOCK', `Acquired grace period lock for ${lockKey}`);
    return lockId;
  }

  logger.debug('GRACE_LOCK', `Failed to acquire grace period lock for ${lockKey}`);
  return null;
}

/**
 * Release a grace period lock
 *
 * @param gameCode - The game code
 * @param lockId - The lock ID returned from acquireGracePeriodLock
 * @param username - Optional player username (must match acquireGracePeriodLock call)
 */
export async function releaseGracePeriodLock(
  gameCode: string,
  lockId: string,
  username?: string
): Promise<void> {
  const lockKey = username
    ? `graceperiod:${gameCode}:${username}`
    : `graceperiod:${gameCode}`;
  await releaseGameLock(lockKey, lockId);
  logger.debug('GRACE_LOCK', `Released grace period lock for ${lockKey}`);
}

/**
 * Execute a function with grace period lock protection
 * Used for word submissions during the grace period
 *
 * @param gameCode - The game code
 * @param fn - The function to execute with lock protection
 * @returns The result of the function, or null if lock couldn't be acquired
 */
export async function withGracePeriodLock<T>(
  gameCode: string,
  fn: () => Promise<T>
): Promise<{ success: boolean; result: T | null; error: Error | null }> {
  const lockId = await acquireGracePeriodLock(gameCode);

  if (!lockId) {
    return {
      success: false,
      result: null,
      error: new Error(`Failed to acquire grace period lock for ${gameCode}`),
    };
  }

  try {
    const result = await fn();
    return { success: true, result, error: null };
  } catch (error) {
    return { success: false, result: null, error: error as Error };
  } finally {
    await releaseGracePeriodLock(gameCode, lockId);
  }
}

const gracePeriodLockModule = {
  acquireGracePeriodLock,
  releaseGracePeriodLock,
  withGracePeriodLock,
};

export default gracePeriodLockModule;
