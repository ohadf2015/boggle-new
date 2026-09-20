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

type ExecutionStats = { votesAgainst?: Map<unknown, Error> };

/**
 * Tell "another replica holds this lock" apart from "Redis is unreachable".
 *
 * With `retryCount: 0` a ResourceLockedError never reaches the caller: redlock
 * records it as a vote and throws `ExecutionError("The operation was unable to
 * achieve a quorum during its retry window.")` instead (node_modules/redlock
 * `_execute` → `_attemptOperation`). Branching on `err.name` therefore logged
 * routine contention at error level — 140 Sentry events on
 * cron:reengagement-email / cron:auto-promotion — while hiding the one detail
 * that matters when it is NOT contention: the per-client cause.
 */
export async function classifyLockFailure(
  err: unknown,
): Promise<{ contention: boolean; reason: string }> {
  if (!(err instanceof Error)) return { contention: false, reason: String(err) };
  if (err.name === 'ResourceLockedError') return { contention: true, reason: err.message };

  const attempts = (err as Error & { attempts?: Promise<ExecutionStats>[] }).attempts;
  if (err.name !== 'ExecutionError' || !Array.isArray(attempts)) {
    return { contention: false, reason: err.message };
  }

  const stats = await Promise.all(
    attempts.map((attempt) => Promise.resolve(attempt).catch(() => null)),
  );
  const against = stats.flatMap((s) => (s?.votesAgainst ? [...s.votesAgainst.values()] : []));
  if (against.length === 0) return { contention: false, reason: err.message };

  return {
    contention: against.every((e) => e?.name === 'ResourceLockedError'),
    reason: against.map((e) => e?.message ?? String(e)).join('; '),
  };
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
    // Failed to acquire lock. Contention is the expected case and must stay
    // quiet; anything else is a real fault and skips this run, so it has to
    // page with the underlying cause, not the generic quorum string.
    const { contention, reason } = await classifyLockFailure(err);
    if (contention) {
      logger.info('REDLOCK', `Skipping ${lockKey} — already running on another replica`);
    } else {
      logger.error('REDLOCK', `Lock acquisition failed for ${lockKey}`, { error: reason });
    }
    return false;
  }
}
