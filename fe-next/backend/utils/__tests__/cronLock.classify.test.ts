/**
 * Sentry JAVASCRIPT-NEXTJS-145 / -1J7 — "[REDLOCK] Lock acquisition failed for
 * cron:reengagement-email / cron:auto-promotion", 140 events, still firing.
 *
 * `withCronLock` branched on `err.name === 'ResourceLockedError'` to tell
 * routine contention apart from a real failure. With `retryCount: 0` that name
 * NEVER reaches the catch: redlock throws `ExecutionError("The operation was
 * unable to achieve a quorum during its retry window.")` and the real cause is
 * a vote inside `err.attempts[i].votesAgainst`. So every replica that lost the
 * race logged `logger.error` with the one string that says nothing — and a
 * genuine "Redis unreachable" logged exactly the same line.
 */
import { describe, it, expect } from 'vitest';
import { classifyLockFailure } from '../cronLock';

function resourceLocked(): Error {
  const e = new Error('The operation was applied to: 0 of the 1 requested resources.');
  e.name = 'ResourceLockedError';
  return e;
}

function executionError(...against: Error[]): Error {
  const e = new Error('The operation was unable to achieve a quorum during its retry window.');
  e.name = 'ExecutionError';
  (e as Error & { attempts: unknown[] }).attempts = [
    Promise.resolve({ votesAgainst: new Map(against.map((err, i) => [i, err])) }),
  ];
  return e;
}

describe('classifyLockFailure', () => {
  it('reads contention out of an ExecutionError whose votes are all ResourceLockedError', async () => {
    expect(await classifyLockFailure(executionError(resourceLocked()))).toMatchObject({ contention: true });
  });

  it('reports a Redis outage as a real failure, with the underlying cause', async () => {
    const result = await classifyLockFailure(executionError(new Error('connect ECONNREFUSED 10.0.0.2:6379')));
    expect(result.contention).toBe(false);
    expect(result.reason).toContain('ECONNREFUSED');
  });

  it('does not call a mixed vote contention', async () => {
    const result = await classifyLockFailure(executionError(resourceLocked(), new Error('ETIMEDOUT')));
    expect(result.contention).toBe(false);
    expect(result.reason).toContain('ETIMEDOUT');
  });

  it('still recognises a bare ResourceLockedError (retryCount > 0 paths)', async () => {
    expect(await classifyLockFailure(resourceLocked())).toMatchObject({ contention: true });
  });

  it('falls back to the message for anything else', async () => {
    expect(await classifyLockFailure(new Error('boom'))).toEqual({ contention: false, reason: 'boom' });
  });
});
