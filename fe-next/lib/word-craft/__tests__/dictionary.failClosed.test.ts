/**
 * Regression: the silent empty dictionary (reported 2026-09-02).
 *
 * A player on the English daily Word Tower typed ICE and was told it was "not
 * in the dictionary". ICE is in the dictionary. What actually happened:
 * `/api/dictionary-words?lang=en` failed for that client, every failure path
 * returned the localStorage cache, and EN can never BE in that cache (2.8MB vs
 * the 1MB MAX_CACHEABLE_CHARS ceiling) — so the loader resolved with an empty
 * Set. An empty Set is not a degraded dictionary; it is a dictionary in which no
 * word is a word, and every caller started a game on it.
 *
 * These tests pin the two halves of the fix: retry once, then throw.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadWordCraftDictionary, loadServerWordList, DictionaryLoadError } from '../dictionary';

const fetchMock = vi.fn();

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => void map.set(k, v)),
    map,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dictionary load — fails closed, loudly', () => {
  it('throws DictionaryLoadError when the network fails and nothing is cached', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(loadWordCraftDictionary('en', { storage: memoryStorage() })).rejects.toBeInstanceOf(
      DictionaryLoadError,
    );
  });

  it('throws on a 200 with an empty body — a truncated or stale CDN entry bricks the game too', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => '   \n\n  ' });
    await expect(loadWordCraftDictionary('en', { storage: memoryStorage() })).rejects.toBeInstanceOf(
      DictionaryLoadError,
    );
  });

  it('retries once before giving up, so a single dropped request is invisible', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce({ ok: true, text: async () => 'ice\ncat' });

    const dict = await loadWordCraftDictionary('en', { storage: memoryStorage() });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dict.has('ICE')).toBe(true);
  });

  it('does not retry when the first attempt succeeds', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => 'ice' });
    await loadWordCraftDictionary('en', { storage: memoryStorage() });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still prefers the cache over throwing, for the locales small enough to have one', async () => {
    const storage = memoryStorage({ lex_wc_dict_ja: JSON.stringify(['ねこ']) });
    fetchMock.mockRejectedValue(new Error('offline'));

    const dict = await loadWordCraftDictionary('ja', { storage });

    expect(dict.has('ねこ')).toBe(true);
  });

  it('English is over the cache ceiling, so a successful load leaves the cache empty — there is no fallback to lose', async () => {
    const storage = memoryStorage();
    // 2.8MB is the real production size of the en payload.
    const huge = Array.from({ length: 300_000 }, (_, i) => `word${i}`).join('\n');
    fetchMock.mockResolvedValue({ ok: true, text: async () => huge });

    await loadServerWordList('en', { storage });

    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
