/**
 * Transport contract for the Word Craft / Word Tower / Gem Hunt dictionary.
 *
 * These games used to load their word list three different ways:
 *   - EN via `await import('an-array-of-english-words')`  → 3.2MB client chunk
 *   - SV via `await import('@arvidbt/swedish-words')`     → 6.3MB client chunk
 *   - HE/ES/JA via /api/word-craft/wordlist (raw JSON, no gzip, its own heap copy)
 *
 * All five now go through /api/dictionary-words, which is gzipped in-route,
 * cached per-language in the shared word sets, and sent with 24h browser /
 * 7d CDN cache headers. These tests pin that contract so nobody re-adds a
 * megabyte of dictionary to the client bundle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadWordCraftDictionary } from '../dictionary';
import type { SupportedLocale } from '../tileBag';

const LOCALES: SupportedLocale[] = ['en', 'sv', 'he', 'es', 'ja'];

const fetchMock = vi.fn();

function textResponse(body: string) {
  return { ok: true, text: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadWordCraftDictionary — transport', () => {
  it.each(LOCALES)('fetches %s from the shared gzipped dictionary endpoint', async (locale) => {
    fetchMock.mockResolvedValue(textResponse('cat\ndog'));

    await loadWordCraftDictionary(locale);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe(`/api/dictionary-words?lang=${locale}`);
  });

  it.each(LOCALES)('never calls the retired word-craft wordlist route for %s', async (locale) => {
    fetchMock.mockResolvedValue(textResponse('cat'));

    await loadWordCraftDictionary(locale);

    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toContain('word-craft/wordlist');
    }
  });

  it('parses the newline-delimited payload into an uppercased lookup set', async () => {
    fetchMock.mockResolvedValue(textResponse('cat\ndog\n\n  bird  \n'));

    const dict = await loadWordCraftDictionary('en');

    expect(dict.has('CAT')).toBe(true);
    expect(dict.has('DOG')).toBe(true);
    expect(dict.has('BIRD')).toBe(true);
    expect(dict.has('')).toBe(false);
  });
});

describe('loadWordCraftDictionary — offline cache', () => {
  function memoryStorage(seed: Record<string, string> = {}) {
    const map = new Map(Object.entries(seed));
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: vi.fn((k: string, v: string) => void map.set(k, v)),
      map,
    };
  }

  it('persists a small payload so a later offline load still validates words', async () => {
    const storage = memoryStorage();
    fetchMock.mockResolvedValue(textResponse('ねこ\nいぬ'));

    await loadWordCraftDictionary('ja', { storage });

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(storage.map.get('lex_wc_dict_ja')).toContain('ねこ');
  });

  it('falls back to the cached copy when the request fails', async () => {
    const storage = memoryStorage({ lex_wc_dict_ja: JSON.stringify(['ねこ']) });
    fetchMock.mockRejectedValue(new Error('offline'));

    const dict = await loadWordCraftDictionary('ja', { storage });

    expect(dict.has('ねこ')).toBe(true);
  });

  it('skips the cache write for payloads that cannot fit in localStorage', async () => {
    const storage = memoryStorage();
    // HE is ~5MB and ES ~6MB of text — JSON.stringify + setItem at that size
    // burns main-thread time and then throws QuotaExceededError anyway.
    const huge = Array.from({ length: 200_000 }, (_, i) => `word${i}`).join('\n');
    fetchMock.mockResolvedValue(textResponse(huge));

    await loadWordCraftDictionary('he', { storage });

    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
