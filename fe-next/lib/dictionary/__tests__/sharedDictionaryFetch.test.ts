import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDictionaryWordsNetwork,
  dictionaryWordsUrl,
  __resetSharedDictionaryFetchForTests,
} from '../sharedDictionaryFetch';

describe('fetchDictionaryWordsNetwork', () => {
  beforeEach(() => {
    __resetSharedDictionaryFetchForTests();
  });

  it('dedupes concurrent callers onto one fetch', async () => {
    const body = 'hello\nworld\n';
    const fetchFn = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(body, { status: 200 })),
    );

    const [a, b] = await Promise.all([
      fetchDictionaryWordsNetwork('en', fetchFn as unknown as typeof fetch),
      fetchDictionaryWordsNetwork('en', fetchFn as unknown as typeof fetch),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(dictionaryWordsUrl('en'), { credentials: 'same-origin' });
    expect(await a.text()).toBe(body);
    expect(await b.text()).toBe(body);
  });

  it('does not share in-flight across languages', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(new Response(url, { status: 200 })),
    );

    await Promise.all([
      fetchDictionaryWordsNetwork('en', fetchFn as unknown as typeof fetch),
      fetchDictionaryWordsNetwork('he', fetchFn as unknown as typeof fetch),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
