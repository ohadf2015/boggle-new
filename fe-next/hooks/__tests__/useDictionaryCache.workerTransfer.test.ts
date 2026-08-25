import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The worker path is the PRIMARY dictionary load path, and it used to hand the
 * words back as `string[]`. Comlink structured-clones that, so the main thread
 * deserialized ~900k individual strings (Spanish payload is 1.46MB gzipped vs
 * English's 717KB) in one unchunkable task — and then built the Set. That is
 * the shape behind field p75 INP of 696ms on /es-mobile against 344ms on /en,
 * measured within the same OS.
 *
 * This test fails if the array API comes back: the fake worker exposes ONLY
 * getWordsText, so any caller reaching for getWords throws.
 */

const getWordsText = vi.fn((_lang: string) => 'casa\nperro\ngato\n');
const load = vi.fn(async () => undefined);

vi.mock('comlink', () => ({
  wrap: () => ({
    load,
    getWordsText: async (lang: string) => getWordsText(lang),
    // Deliberately absent: getWords. Reaching for it must break the test.
  }),
}));

// The offline (downloaded, encrypted) dictionary takes precedence in
// fetchDictionary — stub it away so the worker path is the one exercised.
vi.mock('@/lib/offline/dictionaryDownload', () => ({
  loadOfflineDictionary: async () => null,
  createIdbStores: () => ({}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('Worker', class { terminate() {} });
  // No IndexedDB in jsdom: getCachedDictionary rejects and the loader falls
  // through to the worker, which is exactly the path under test.
  vi.stubGlobal('indexedDB', undefined);
});

describe('worker dictionary transfer', () => {
  it('loads via the text API and never asks for the word array', async () => {
    const { prewarmDictionary, hasWordInMemoryCache } = await import('../useDictionaryCache');

    await prewarmDictionary('es');

    expect(load).toHaveBeenCalledWith('es');
    expect(getWordsText).toHaveBeenCalledWith('es');
    expect(hasWordInMemoryCache('casa', 'es')).toBe(true);
    expect(hasWordInMemoryCache('perro', 'es')).toBe(true);
    // A definite miss, not "unknown" — proves the Set was actually built.
    expect(hasWordInMemoryCache('zzzzz', 'es')).toBe(false);
  });
});
