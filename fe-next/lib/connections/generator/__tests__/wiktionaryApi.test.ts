import { describe, it, expect, vi } from 'vitest';
import { fetchCategoryMembers } from '../wiktionaryApi';

const mkResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('fetchCategoryMembers', () => {
  it('returns titles in ns=0 from a single page response', async () => {
    const fetcher = vi.fn().mockResolvedValue(mkResponse({
      query: {
        categorymembers: [
          { ns: 0, title: 'בית ספר' },
          { ns: 0, title: 'ספר תורה' },
          { ns: 14, title: 'תת-קטגוריה' },
        ],
      },
    }));
    const titles = await fetchCategoryMembers('he.wiktionary.org', 'קטגוריה:צירופים', { fetcher });
    expect(titles).toEqual(['בית ספר', 'ספר תורה']);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('follows continuation cursor until exhausted', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'בית ספר' }] },
        continue: { cmcontinue: 'XYZ' },
      }))
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'ספר תורה' }] },
      }));
    const titles = await fetchCategoryMembers('he.wiktionary.org', 'קטגוריה:צירופים', { fetcher });
    expect(titles).toEqual(['בית ספר', 'ספר תורה']);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const secondCall = fetcher.mock.calls[1][0] as string;
    expect(secondCall).toContain('cmcontinue=XYZ');
  });

  it('passes category, limit, and format in request URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(mkResponse({ query: { categorymembers: [] } }));
    await fetchCategoryMembers('he.wiktionary.org', 'קטגוריה:צירופים', { fetcher, limit: 250 });
    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('https://he.wiktionary.org/w/api.php');
    expect(url).toContain('action=query');
    expect(url).toContain('list=categorymembers');
    expect(url).toContain('format=json');
    expect(url).toContain('cmlimit=250');
    expect(url).toContain(encodeURIComponent('קטגוריה:צירופים'));
  });

  it('throws on non-2xx response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('err', { status: 500 }));
    await expect(
      fetchCategoryMembers('he.wiktionary.org', 'קטגוריה:צירופים', { fetcher }),
    ).rejects.toThrow(/500/);
  });
});
