import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useDictionaryCache', () => ({
  hasWordInMemoryCache: () => null,
  prewarmDictionary: () => Promise.resolve(),
}));

import { usePrevalidation } from '../usePrevalidation';

async function prefetchWith(response: Response) {
  global.fetch = vi.fn(async () => response) as unknown as typeof fetch;
  const { result } = renderHook(() => usePrevalidation('en'));
  act(() => result.current.prefetch('house'));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
  return result.current.getCached('house');
}

describe('usePrevalidation caches only definitive answers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given the server dictionary is still loading, then nothing is cached', async () => {
    await expect(prefetchWith(new Response(JSON.stringify({ isValid: false, source: 'not_loaded' })))).resolves.toBeUndefined();
  });

  it('given a rate-limited check, then nothing is cached', async () => {
    await expect(prefetchWith(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))).resolves.toBeUndefined();
  });

  it('given a definitive not-a-word answer, then false is cached', async () => {
    await expect(prefetchWith(new Response(JSON.stringify({ isValid: false, source: 'unknown' })))).resolves.toBe(false);
  });
});
