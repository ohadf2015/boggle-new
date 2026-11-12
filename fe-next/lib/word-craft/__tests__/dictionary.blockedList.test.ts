import { describe, it, expect, vi } from 'vitest';
import { loadWordCraftDictionary } from '../dictionary';
import { dictionaryWordsUrl, encodeDictionaryPayload } from '@/lib/dictionary/sharedDictionaryFetch';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

describe('loadWordCraftDictionary when a network filter blocks the Hebrew list', () => {
  it('loads the Hebrew words from the encoded list on the retry', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url === dictionaryWordsUrl('he', { encoded: true })
          ? { ok: true, status: 200, text: async () => encodeDictionaryPayload('שלום\nמים') }
          : { ok: false, status: 418, text: async () => 'blocked' },
      ),
    );

    const dict = await loadWordCraftDictionary('he', {
      fetchFn: fetchFn as unknown as typeof fetch,
      storage: { getItem: () => null, setItem: () => undefined },
    });

    expect(dict.has(normalizeHebrewWord('שלום').toUpperCase())).toBe(true);
    expect(dict.has('CAT')).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[1][0])).toBe(dictionaryWordsUrl('he', { encoded: true }));
  });
});
