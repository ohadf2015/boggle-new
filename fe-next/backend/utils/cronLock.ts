/**
 * Distributed cron lock using Redlock
 * Prevents duplicate cron job execution across multiple server replicas.
 */
import { getRedisClient } from '../redis/connection';
import logger from './logger';

// Dynamic import for redlock (ESM module with broken type exports)
let _redlockInstance: any = null;

async function getRedlock(): Promise<any> {
  if (_redlockInstance) return _redlockInstance;

  const client = getRedisClient();
  if (!client) return null;

  // @ts-expect-error redlock package.json exports don't expose types correctly
  const { default: Redlock } = await import('redlock');

  _redlockInstance = new Redlock([client], {
    retryCount: 0,        // Don't retry — if another replica holds the lock, skip
    automaticExtensionThreshold: 5000,
  });

  _redlockInstance.on('error', (err: Error) => {
    // Ignore ResourceLockedError — expected when another replica holds the lock
    if (err.name === 'ResourceLockedError') return;
    logger.error('REDLOCK', 'Lock error', { error: err.message });
  });

  return _redlockInstance;
}

/**
 * Execute a function with a distributed lock.
 * If the lock cannot be acquired (another replica is running), the function is skipped.
 *
 * @param lockKey - Unique key for this cron job (e.g. 'cron:wikipedia')
 * @param ttlMs - Lock TTL in milliseconds (should exceed max expected job duration)
 * @param fn - The async function to execute while holding the lock
 * @returns true if executed, false if skipped
 */
export async function withCronLock(
  lockKey: string,
  ttlMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const redlock = await getRedlock();

  if (!redlock) {
    // No Redis available — run without lock (single-instance fallback)
    logger.warn('REDLOCK', `No Redis for lock ${lockKey}, running without lock`);
    await fn();
    return true;
  }

  try {
    const lock = await redlock.acquire([`lock:${lockKey}`], ttlMs);
    try {
      await fn();
      return true;
    } finally {
      try {
        await lock.release();
      } catch {
        // Lock may have expired if job took too long — that's fine
      }
    }
  } catch (err) {
    // Failed to acquire lock — another replica is running this job
    if (err instanceof Error && err.name === 'ResourceLockedError') {
      logger.info('REDLOCK', `Skipping ${lockKey} — already running on another replica`);
    } else {
      logger.error('REDLOCK', `Lock acquisition failed for ${lockKey}`, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    return false;
  }
}
