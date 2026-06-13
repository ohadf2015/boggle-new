import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedWithTtl, __resetTtlCache } from '../ttlCache';

describe('cachedWithTtl', () => {
  beforeEach(() => {
    __resetTtlCache();
  });

  it('returns the loader result on a cold miss', async () => {
    const loader = vi.fn().mockResolvedValue('fresh');
    const result = await cachedWithTtl('k', loader, { ttlMs: 1000 });
    expect(result).toBe('fresh');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value within the TTL without re-invoking the loader', async () => {
    let clock = 0;
    const now = () => clock;
    const loader = vi.fn().mockResolvedValue('v1');

    await cachedWithTtl('k', loader, { ttlMs: 1000, now });
    clock = 500; // still inside the TTL window
    const second = await cachedWithTtl('k', loader, { ttlMs: 1000, now });

    expect(second).toBe('v1');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('refreshes by calling the loader again once the TTL has elapsed', async () => {
    let clock = 0;
    const now = () => clock;
    const loader = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');

    await cachedWithTtl('k', loader, { ttlMs: 1000, now });
    clock = 1001; // past expiry
    const refreshed = await cachedWithTtl('k', loader, { ttlMs: 1000, now });

    expect(refreshed).toBe('v2');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent misses into a single in-flight loader call (single-flight)', async () => {
    let resolveLoad: (v: string) => void = () => {};
    const loader = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolveLoad = resolve; })
    );

    // Fire many concurrent requests before the loader resolves.
    const all = Promise.all(
      Array.from({ length: 5 }, () => cachedWithTtl('k', loader, { ttlMs: 1000 }))
    );
    resolveLoad('shared');
    const results = await all;

    expect(results).toEqual(['shared', 'shared', 'shared', 'shared', 'shared']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected loader — the next call retries', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(cachedWithTtl('k', loader, { ttlMs: 1000 })).rejects.toThrow('boom');
    const second = await cachedWithTtl('k', loader, { ttlMs: 1000 });

    expect(second).toBe('recovered');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('isolates entries by key', async () => {
    const a = await cachedWithTtl('a', () => Promise.resolve('A'), { ttlMs: 1000 });
    const b = await cachedWithTtl('b', () => Promise.resolve('B'), { ttlMs: 1000 });
    expect(a).toBe('A');
    expect(b).toBe('B');
  });
});
