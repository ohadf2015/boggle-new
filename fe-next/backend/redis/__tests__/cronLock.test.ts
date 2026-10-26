/**
 * TDD test for cron lock helpers.
 * Verifies tryAcquireCronLock + withCronLock single-runner semantics.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let storedKeys: Record<string, string> = {};

const mockClient = {
  status: 'ready',
  set: vi.fn(async (key: string, value: string, _px: string, _ttl: number, mode: string) => {
    if (mode === 'NX' && storedKeys[key]) return null;
    storedKeys[key] = value;
    return 'OK';
  }),
  eval: vi.fn(async (_script: string, _numKeys: number, key: string, value: string) => {
    if (storedKeys[key] === value) {
      delete storedKeys[key];
      return 1;
    }
    return 0;
  }),
};

const redisState = { available: true };
// The cron routes' copy of ../connection never connects (null / false); only
// the shared handle the server published carries the client.
vi.mock('../connection', () => ({
  // Next route code gets its own copy of the module: its own client/flag stay unset.
  getRedisClient: () => null,
  isRedisAvailable: () => false,
  getSharedRedisClient: () => (redisState.available ? mockClient : null),
}));

vi.mock('../circuitBreaker', () => ({
  circuitBreaker: { execute: (fn: () => Promise<unknown>) => fn() },
}));

describe('cron lock', () => {
  beforeEach(() => {
    storedKeys = {};
    redisState.available = true;
    mockClient.status = 'ready';
    vi.clearAllMocks();
  });

  it('Given Redis errors on acquire, When a cron runs, Then it fails loudly instead of reporting already-running', async () => {
    const { withCronLock, CronLockError } = await import('../locking');
    mockClient.set.mockRejectedValueOnce(new Error('ECONNRESET'));
    const fn = vi.fn(async () => 'ran');
    await expect(withCronLock('teacher-weekly-digest', 60_000, fn)).rejects.toBeInstanceOf(CronLockError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('Given no Redis at all, When a cron runs, Then it runs unprotected and says so', async () => {
    const logger = (await import('../../utils/logger')).default;
    const { withCronLock } = await import('../locking');
    redisState.available = false;
    const r = await withCronLock('teacher-weekly-digest', 60_000, async () => 'ran');
    expect(r).toEqual({ status: 'ran', result: 'ran' });
    expect(logger.warn).toHaveBeenCalledWith('CRON_LOCK', expect.stringContaining('teacher-weekly-digest'));
  });

  it('Given the shared client is reconnecting, When a cron runs, Then it runs unprotected and says so', async () => {
    const logger = (await import('../../utils/logger')).default;
    const { withCronLock } = await import('../locking');
    mockClient.status = 'reconnecting';
    const r = await withCronLock('teacher-abandoned-checkout', 60_000, async () => 'ran');
    expect(r).toEqual({ status: 'ran', result: 'ran' });
    expect(mockClient.set).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('CRON_LOCK', expect.stringContaining('teacher-abandoned-checkout'));
  });

  it('Given only the server-published Redis handle, When a cron runs, Then it takes the lock instead of running unprotected', async () => {
    const logger = (await import('../../utils/logger')).default;
    const { withCronLock } = await import('../locking');
    const r = await withCronLock('teacher-abandoned-checkout', 60_000, async () => 'ran');
    expect(r).toEqual({ status: 'ran', result: 'ran' });
    expect(mockClient.set).toHaveBeenCalledWith(expect.stringMatching(/:cron:teacher-abandoned-checkout$/), expect.any(String), 'PX', 60_000, 'NX');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('tryAcquireCronLock returns lockId when key is free', async () => {
    const { tryAcquireCronLock } = await import('../locking');
    const id = await tryAcquireCronLock('select-daily-words', 60_000);
    expect(id).toBeTruthy();
    const keys = Object.keys(storedKeys);
    expect(keys.length).toBe(1);
    expect(keys[0]).toMatch(/:cron:select-daily-words$/);
    expect(storedKeys[keys[0]]).toBe(id);
  });

  it('tryAcquireCronLock returns null when key already held', async () => {
    const { tryAcquireCronLock } = await import('../locking');
    const first = await tryAcquireCronLock('select-daily-words', 60_000);
    expect(first).toBeTruthy();
    const second = await tryAcquireCronLock('select-daily-words', 60_000);
    expect(second).toBeNull();
  });

  it('withCronLock returns ALREADY_RUNNING when concurrent attempt', async () => {
    const { withCronLock } = await import('../locking');
    const first = withCronLock('select-daily-words', 60_000, async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 'done-1';
    });
    const second = withCronLock('select-daily-words', 60_000, async () => 'done-2');
    const [r1, r2] = await Promise.all([first, second]);
    expect(r1.status).toBe('ran');
    expect(r2.status).toBe('skipped');
  });

  it('withCronLock releases lock after fn completes', async () => {
    const { withCronLock } = await import('../locking');
    const r1 = await withCronLock('select-daily-words', 60_000, async () => 'done-1');
    expect(r1.status).toBe('ran');
    const r2 = await withCronLock('select-daily-words', 60_000, async () => 'done-2');
    expect(r2.status).toBe('ran');
  });

  it('withCronLock releases lock even when fn throws', async () => {
    const { withCronLock } = await import('../locking');
    await expect(
      withCronLock('select-daily-words', 60_000, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    const r2 = await withCronLock('select-daily-words', 60_000, async () => 'done-2');
    expect(r2.status).toBe('ran');
  });
});
