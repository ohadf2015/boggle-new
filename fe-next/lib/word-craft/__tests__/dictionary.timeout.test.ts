/**
 * PostHog inbox 01a15a17: the Word Tower loader had no fetch timeout, so a
 * stalled connection hung the screen and never reached its retry.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FETCH_TIMEOUT_MS, loadServerWordList } from '../dictionary';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('loadServerWordList timeout', () => {
  it('aborts a stalled fetch and moves on to the retry', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      )
      .mockResolvedValueOnce(new Response(btoa('ABC\nDEF'), { status: 200 }));

    const pending = loadServerWordList('en', { fetchFn: fetchFn as unknown as typeof fetch, storage: { getItem: () => null, setItem: () => {} } });
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1000);
    await expect(pending).resolves.toEqual(['ABC', 'DEF']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
