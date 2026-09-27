import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression: an empty dictionary must never be marked "loaded".
 *
 * Consumers read `isLoaded` as "this Set is authoritative". hooks/useWordSubmission
 * used to hard-reject a cache miss on that basis, so a dictionary that loaded to
 * size 0 called every real word invalid — the same shape as the 2026-09-02 Word
 * Tower "ice" report, on the Daily Challenge instead. Worse here: the empty Set
 * was written to memory AND IndexedDB, so it survived reloads.
 *
 * /api/dictionary-words memoises its payload for the whole process lifetime, so
 * one bad build there is exactly how an empty 200 arrives — and it arrives for
 * every client at once.
 */

vi.mock('@/lib/offline/dictionaryDownload', () => ({
  createIdbStores: () => ({ blobStore: {}, keyStore: {} }),
  loadOfflineDictionary: async () => null,
}));

import {
  prewarmDictionary,
  hasWordInMemoryCache,
  __resetDictionaryCacheForTests,
} from '../useDictionaryCache';

function textResponse(body: string) {
  return { ok: true, status: 200, text: async () => body } as unknown as Response;
}

describe('useDictionaryCache — an empty payload is a failure, not a dictionary', () => {
  beforeEach(() => {
    __resetDictionaryCacheForTests();
    vi.restoreAllMocks();
  });

  it('does not cache a 200 with an empty body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(textResponse(''));

    await prewarmDictionary('en');

    // null = "no dictionary here", which callers treat as "ask the server".
    // false would mean "loaded, and this word is not a word".
    expect(hasWordInMemoryCache('ice', 'en')).toBeNull();
  });

  it('does not cache a body that is only blank lines', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(textResponse('\n\n   \n'));

    await prewarmDictionary('en');

    expect(hasWordInMemoryCache('ice', 'en')).toBeNull();
  });

  it('still caches a real payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(textResponse('ice\ncat\ndog'));

    await prewarmDictionary('en');

    expect(hasWordInMemoryCache('ice', 'en')).toBe(true);
    expect(hasWordInMemoryCache('zzzz', 'en')).toBe(false);
  });

  it('a failed load leaves the cache unwarmed rather than empty-but-loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as unknown as Response);

    await prewarmDictionary('en');

    expect(hasWordInMemoryCache('ice', 'en')).toBeNull();
  });
});
