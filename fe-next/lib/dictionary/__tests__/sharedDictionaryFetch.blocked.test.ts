import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDictionaryWordsNetwork,
  dictionaryWordsUrl,
  encodeDictionaryPayload,
  __resetSharedDictionaryFetchForTests,
} from '../sharedDictionaryFetch';

const blocked = () => new Response('<html>blocked</html>', { status: 418 });

describe('fetchDictionaryWordsNetwork when the plain list is blocked', () => {
  beforeEach(() => {
    __resetSharedDictionaryFetchForTests();
  });

  it('refetches the encoded list and hands callers the decoded words', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url === dictionaryWordsUrl('he', { encoded: true })
          ? new Response(encodeDictionaryPayload('שלום\nמים'), { status: 200 })
          : blocked(),
      ),
    );

    const res = await fetchDictionaryWordsNetwork('he', fetchFn as unknown as typeof fetch);

    expect(res.ok).toBe(true);
    expect(await res.text()).toBe('שלום\nמים');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('reports the original failure when the encoded list fails too', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(blocked()));

    const res = await fetchDictionaryWordsNetwork('he', fetchFn as unknown as typeof fetch);

    expect(res.ok).toBe(false);
    expect(res.status).toBe(418);
  });

  it('does not keep a failed response for the next caller', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(blocked()))
      .mockImplementationOnce(() => Promise.resolve(blocked()))
      .mockImplementation(() => Promise.resolve(new Response('cat', { status: 200 })));

    await fetchDictionaryWordsNetwork('en', fetchFn as unknown as typeof fetch);
    const retry = await fetchDictionaryWordsNetwork('en', fetchFn as unknown as typeof fetch);

    expect(await retry.text()).toBe('cat');
  });
});
