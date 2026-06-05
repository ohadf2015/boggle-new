import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadOfflineDictionary = vi.fn();
vi.mock('@/lib/offline/dictionaryDownload', () => ({
  createIdbStores: () => ({ blobStore: {}, keyStore: {} }),
  loadOfflineDictionary: (...args: unknown[]) => loadOfflineDictionary(...args),
}));

import {
  prewarmDictionary,
  hasWordInMemoryCache,
  __resetDictionaryCacheForTests,
} from '../useDictionaryCache';

describe('useDictionaryCache — encrypted offline download tier', () => {
  beforeEach(() => {
    __resetDictionaryCacheForTests();
    loadOfflineDictionary.mockReset();
    vi.restoreAllMocks();
  });

  it('prefers an explicitly downloaded (encrypted) dictionary over the network', async () => {
    loadOfflineDictionary.mockResolvedValue(new Set(['downloadedword']));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await prewarmDictionary('en');

    expect(loadOfflineDictionary).toHaveBeenCalled();
    expect(hasWordInMemoryCache('downloadedword', 'en')).toBe(true);
    // Authoritative offline source — no network fetch when a download exists.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls through to the normal load path when nothing was downloaded', async () => {
    loadOfflineDictionary.mockResolvedValue(null);
    // Force the downstream network path to fail so we isolate the intent: a null
    // download result must NOT populate the cache from the download tier.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await prewarmDictionary('en');

    expect(loadOfflineDictionary).toHaveBeenCalled();
    // Download tier didn't inject anything → cache stays unwarmed.
    expect(hasWordInMemoryCache('anything', 'en')).toBeNull();
  });
});
