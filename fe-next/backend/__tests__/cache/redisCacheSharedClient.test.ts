import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const shared = vi.hoisted(() => ({ client: null as unknown as object | null }));
vi.mock('../../redis/connection', () => ({ getRedisClient: () => shared.client }));

import { getCacheClient, failFast } from '../../cache/redisCache';

describe('getCacheClient', () => {
  beforeEach(() => {
    shared.client = null;
  });

  it('uses the shared Redis connection when it is initialised', () => {
    const connection = { get: vi.fn() };
    shared.client = connection;
    expect(getCacheClient()).toBe(connection);
  });
});

describe('failFast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the command result when it finishes in time', async () => {
    await expect(failFast(Promise.resolve('hit'))).resolves.toBe('hit');
  });

  it('rejects after one second when the command stalls', async () => {
    const stalled = failFast(new Promise(() => {}));
    const assertion = expect(stalled).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});
