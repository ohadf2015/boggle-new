import { describe, it, expect, vi } from 'vitest';
import { fetchPhraseTotalHits, makeCachedFreqLookup } from '../frequencyApi';

const mkResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('fetchPhraseTotalHits', () => {
  it('returns totalhits from CirrusSearch searchinfo', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      mkResponse({ query: { searchinfo: { totalhits: 1234 }, search: [] } }),
    );
    const hits = await fetchPhraseTotalHits('he.wikipedia.org', 'ספורט מוטורי', { fetcher });
    expect(hits).toBe(1234);
  });

  it('wraps the phrase in quotes for exact-match CirrusSearch', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      mkResponse({ query: { searchinfo: { totalhits: 0 }, search: [] } }),
    );
    await fetchPhraseTotalHits('he.wikipedia.org', 'ספורט מוטורי', { fetcher });
    const url = fetcher.mock.calls[0][0] as string;
    const srsearch = decodeURIComponent((/srsearch=([^&]+)/.exec(url)?.[1] ?? '').replace(/\+/g, ' '));
    expect(srsearch).toBe('"ספורט מוטורי"');
    expect(url).toContain('srinfo=totalhits');
    expect(url).toContain('srlimit=1');
  });

  it('returns 0 when searchinfo is missing', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      mkResponse({ query: { search: [] } }),
    );
    const hits = await fetchPhraseTotalHits('he.wikipedia.org', 'x y', { fetcher });
    expect(hits).toBe(0);
  });

  it('throws on non-2xx', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('err', { status: 500 }));
    await expect(
      fetchPhraseTotalHits('he.wikipedia.org', 'x y', { fetcher }),
    ).rejects.toThrow(/500/);
  });
});

describe('makeCachedFreqLookup', () => {
  it('caches results across calls for the same bigram', async () => {
    const backend = vi.fn(async (phrase: string) => phrase.length);
    const lookup = makeCachedFreqLookup(backend);

    expect(await lookup('ab')).toBe(2);
    expect(await lookup('ab')).toBe(2);
    expect(await lookup('abc')).toBe(3);
    expect(backend).toHaveBeenCalledTimes(2);
  });

  it('normalizes whitespace before caching', async () => {
    const backend = vi.fn(async () => 7);
    const lookup = makeCachedFreqLookup(backend);
    await lookup('a  b');
    await lookup('a b');
    expect(backend).toHaveBeenCalledTimes(1);
  });
});
