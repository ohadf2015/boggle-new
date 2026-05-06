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

vi.mock('../connection', () => ({
  getRedisClient: () => mockClient,
  isRedisAvailable: () => true,
}));

vi.mock('../circuitBreaker', () => ({
  circuitBreaker: { execute: (fn: () => Promise<unknown>) => fn() },
}));

describe('cron lock', () => {
  beforeEach(() => {
    storedKeys = {};
    vi.clearAllMocks();
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
