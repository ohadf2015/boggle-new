/**
 * A loaded dictionary is the whole language, so it is authoritative BOTH ways.
 * Before this, only a hit short-circuited: every rejected word (and every word
 * while the cache was cold) paid a network round-trip before the board could
 * show accept/reject — the "words take forever to validate" report.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWordChecker } from '../useWordChecker';

const cache = { checkWord: vi.fn(), isLoaded: true };
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => cache,
  hasWordInMemoryCache: () => null,
  prewarmDictionary: () => Promise.resolve(),
}));

describe('useWordChecker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cache.checkWord = vi.fn();
    cache.isLoaded = true;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isValid: true }) }) as never;
  });

  it('given a loaded dictionary and a known word, when checked, then no network call', async () => {
    cache.checkWord = vi.fn().mockReturnValue(true);
    const { result } = renderHook(() => useWordChecker('en'));
    await expect(result.current('house')).resolves.toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('given a loaded dictionary and an unknown word, when checked, then rejected without a network call', async () => {
    cache.checkWord = vi.fn().mockReturnValue(false);
    const { result } = renderHook(() => useWordChecker('en'));
    await expect(result.current('zzqxk')).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('given a cold cache, when checked, then it falls back to the server', async () => {
    cache.isLoaded = false;
    cache.checkWord = vi.fn().mockReturnValue(false);
    const { result } = renderHook(() => useWordChecker('en'));
    await expect(result.current('house')).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('given a cold cache and a rate-limited server, when checked, then the answer is unknown (null), not false', async () => {
    cache.isLoaded = false;
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': '1' } }),
    ) as never;
    const { result } = renderHook(() => useWordChecker('en'));
    await expect(result.current('house')).resolves.toBeNull();
  });
});
