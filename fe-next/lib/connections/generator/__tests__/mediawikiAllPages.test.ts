import { describe, it, expect, vi } from 'vitest';
import { fetchAllPageTitles } from '../wiktionaryApi';

const mkResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('fetchAllPageTitles', () => {
  it('returns ns=0 titles from a single page response', async () => {
    const fetcher = vi.fn().mockResolvedValue(mkResponse({
      query: {
        allpages: [
          { pageid: 1, ns: 0, title: 'בית ספר' },
          { pageid: 2, ns: 0, title: 'ארצות הברית' },
        ],
      },
    }));
    const titles = await fetchAllPageTitles('he.wikipedia.org', { fetcher });
    expect(titles).toEqual(['בית ספר', 'ארצות הברית']);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('follows apcontinue cursor until exhausted', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(mkResponse({
        query: { allpages: [{ pageid: 1, ns: 0, title: 'בית ספר' }] },
        continue: { apcontinue: 'NEXT' },
      }))
      .mockResolvedValueOnce(mkResponse({
        query: { allpages: [{ pageid: 2, ns: 0, title: 'ספר תורה' }] },
      }));
    const titles = await fetchAllPageTitles('he.wikipedia.org', { fetcher });
    expect(titles).toEqual(['בית ספר', 'ספר תורה']);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const secondCall = fetcher.mock.calls[1][0] as string;
    expect(secondCall).toContain('apcontinue=NEXT');
  });

  it('passes namespace=0 and format in request URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(mkResponse({ query: { allpages: [] } }));
    await fetchAllPageTitles('he.wikipedia.org', { fetcher, limit: 250 });
    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('https://he.wikipedia.org/w/api.php');
    expect(url).toContain('action=query');
    expect(url).toContain('list=allpages');
    expect(url).toContain('apnamespace=0');
    expect(url).toContain('aplimit=250');
    expect(url).toContain('format=json');
  });

  it('throws on non-2xx response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('err', { status: 503 }));
    await expect(
      fetchAllPageTitles('he.wikipedia.org', { fetcher }),
    ).rejects.toThrow(/503/);
  });

  it('respects maxPages cap to stop early on massive wikis', async () => {
    const fetcher = vi.fn().mockImplementation(async () => mkResponse({
      query: { allpages: [{ pageid: 1, ns: 0, title: 'X' }] },
      continue: { apcontinue: 'MORE' },
    }));
    const titles = await fetchAllPageTitles('he.wikipedia.org', { fetcher, maxPages: 3 });
    expect(titles).toHaveLength(3);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
