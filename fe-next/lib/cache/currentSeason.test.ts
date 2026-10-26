/**
 * getCachedCurrentSeasonId — the season id changes once per season, yet
 * rpc/get_current_season_id was firing once per landing SSR request
 * (4,415/day on 2026-10-25, UA "node"). Cache it in-process for 5 minutes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedCurrentSeasonId, CURRENT_SEASON_CACHE_TTL_MS } from './currentSeason';
import { __resetTtlCache } from './ttlCache';

describe('getCachedCurrentSeasonId', () => {
  beforeEach(() => {
    __resetTtlCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves repeat calls from memory within the TTL', async () => {
    const loader = vi.fn().mockResolvedValue(7);
    await expect(getCachedCurrentSeasonId(loader)).resolves.toBe(7);
    await expect(getCachedCurrentSeasonId(loader)).resolves.toBe(7);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('refetches once the 5-minute TTL expires', async () => {
    const loader = vi.fn().mockResolvedValue(7);
    await getCachedCurrentSeasonId(loader);
    vi.setSystemTime(new Date(Date.now() + CURRENT_SEASON_CACHE_TTL_MS + 1));
    await getCachedCurrentSeasonId(loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent misses into one loader call', async () => {
    let resolveIt: (v: number) => void = () => {};
    const loader = vi.fn(() => new Promise<number>((res) => { resolveIt = res; }));
    const a = getCachedCurrentSeasonId(loader);
    const b = getCachedCurrentSeasonId(loader);
    resolveIt(3);
    await expect(a).resolves.toBe(3);
    await expect(b).resolves.toBe(3);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected loader (fail-open)', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(9);
    await expect(getCachedCurrentSeasonId(loader)).rejects.toThrow('db down');
    await expect(getCachedCurrentSeasonId(loader)).resolves.toBe(9);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
