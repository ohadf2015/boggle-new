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
import logger from '../utils/logger';

// Grace period lock specific configuration
const GRACE_PERIOD_LOCK_TTL = 2000; // 2 seconds max (grace period is 1.5s)
const GRACE_PERIOD_LOCK_PREFIX = `${LOCK_PREFIX}:graceperiod`;

/**
 * Acquire a lock for grace period word submission
 *
 * @param gameCode - The game code
 * @returns Lock ID if acquired, null if failed
 */
export async function acquireGracePeriodLock(gameCode: string): Promise<string | null> {
  const lockId = randomUUID();

  // Use a grace period specific key
  const acquired = await acquireGameLock(
    `graceperiod:${gameCode}`,
    lockId,
    GRACE_PERIOD_LOCK_TTL
  );

  if (acquired) {
    logger.debug('GRACE_LOCK', `Acquired grace period lock for ${gameCode}`);
    return lockId;
  }

  logger.debug('GRACE_LOCK', `Failed to acquire grace period lock for ${gameCode}`);
  return null;
}

/**
 * Release a grace period lock
 *
 * @param gameCode - The game code
 * @param lockId - The lock ID returned from acquireGracePeriodLock
 */
export async function releaseGracePeriodLock(
  gameCode: string,
  lockId: string
): Promise<void> {
  await releaseGameLock(`graceperiod:${gameCode}`, lockId);
  logger.debug('GRACE_LOCK', `Released grace period lock for ${gameCode}`);
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
