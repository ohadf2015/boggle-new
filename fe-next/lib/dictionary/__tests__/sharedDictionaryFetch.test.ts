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

  it('never hits the network for a language with no client dictionary', async () => {
    // Regression (t_2a7bb6a8): before /api/dictionary-words derived its
    // allow-list from SUPPORTED_GAME_LANGUAGES, a playable-but-unlisted locale
    // ('ru') got a 400 on every game — and each retry/refetch looped that 400.
    // A language outside SUPPORTED_GAME_LANGUAGES can NEVER be served, so skip
    // the request entirely; the non-OK status lets callers fall back to
    // server-side validation silently.
    const fetchFn = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response('nope', { status: 200 })),
    );

    const res = await fetchDictionaryWordsNetwork('fr', fetchFn as unknown as typeof fetch);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
  });
});
