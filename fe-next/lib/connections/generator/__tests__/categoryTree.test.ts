import { describe, it, expect, vi } from 'vitest';
import { fetchSubcategories, walkCategoryTree } from '../wiktionaryApi';

const mkResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('fetchSubcategories', () => {
  it('returns ns=14 titles only', async () => {
    const fetcher = vi.fn().mockResolvedValue(mkResponse({
      query: {
        categorymembers: [
          { ns: 14, title: 'קטגוריה:פסטות' },
          { ns: 14, title: 'קטגוריה:מרקים' },
          { ns: 0, title: 'פסטה בולונז' },
        ],
      },
    }));
    const subs = await fetchSubcategories('he.wikipedia.org', 'קטגוריה:מאכלים', { fetcher });
    expect(subs).toEqual(['קטגוריה:פסטות', 'קטגוריה:מרקים']);
  });

  it('requests cmtype=subcat', async () => {
    const fetcher = vi.fn().mockResolvedValue(mkResponse({ query: { categorymembers: [] } }));
    await fetchSubcategories('he.wikipedia.org', 'קטגוריה:מאכלים', { fetcher });
    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('cmtype=subcat');
  });

  it('follows pagination', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 14, title: 'קטגוריה:A' }] },
        continue: { cmcontinue: 'NEXT' },
      }))
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 14, title: 'קטגוריה:B' }] },
      }));
    const subs = await fetchSubcategories('he.wikipedia.org', 'קטגוריה:מאכלים', { fetcher });
    expect(subs).toEqual(['קטגוריה:A', 'קטגוריה:B']);
  });
});

describe('walkCategoryTree', () => {
  it('collects ns=0 titles from root at depth=0', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('cmtype=subcat')) {
        return mkResponse({ query: { categorymembers: [] } });
      }
      return mkResponse({
        query: {
          categorymembers: [
            { ns: 0, title: 'ציוד ספורט' },
            { ns: 14, title: 'קטגוריה:ספורט חורף' },
          ],
        },
      });
    });
    const titles = await walkCategoryTree('he.wikipedia.org', 'קטגוריה:ספורט', {
      fetcher,
      maxDepth: 0,
    });
    expect(titles).toEqual(['ציוד ספורט']);
  });

  it('recurses into subcategories up to maxDepth', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      const cat = decodeURIComponent(
        (/cmtitle=([^&]+)/.exec(url)?.[1] ?? '').replace(/\+/g, ' '),
      );
      const isSubcatQuery = url.includes('cmtype=subcat');

      if (cat === 'קטגוריה:ספורט') {
        if (isSubcatQuery) {
          return mkResponse({
            query: { categorymembers: [{ ns: 14, title: 'קטגוריה:ספורט חורף' }] },
          });
        }
        return mkResponse({
          query: { categorymembers: [{ ns: 0, title: 'ציוד ספורט' }] },
        });
      }
      if (cat === 'קטגוריה:ספורט חורף') {
        if (isSubcatQuery) {
          return mkResponse({ query: { categorymembers: [] } });
        }
        return mkResponse({
          query: { categorymembers: [{ ns: 0, title: 'משקה חורף' }] },
        });
      }
      return mkResponse({ query: { categorymembers: [] } });
    });

    const titles = await walkCategoryTree('he.wikipedia.org', 'קטגוריה:ספורט', {
      fetcher,
      maxDepth: 1,
    });
    expect(titles.sort()).toEqual(['ציוד ספורט', 'משקה חורף'].sort());
  });

  it('stops at maxDepth and does not recurse further', async () => {
    const visited: string[] = [];
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      const cat = decodeURIComponent((/cmtitle=([^&]+)/.exec(url)?.[1] ?? '').replace(/\+/g, ' '));
      const isSubcatQuery = url.includes('cmtype=subcat');
      if (isSubcatQuery) visited.push(cat);

      if (cat === 'קטגוריה:root') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [{ ns: 14, title: 'קטגוריה:lvl1' }] } });
        return mkResponse({ query: { categorymembers: [{ ns: 0, title: 'a' }] } });
      }
      if (cat === 'קטגוריה:lvl1') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [{ ns: 14, title: 'קטגוריה:lvl2' }] } });
        return mkResponse({ query: { categorymembers: [{ ns: 0, title: 'b' }] } });
      }
      if (cat === 'קטגוריה:lvl2') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [] } });
        return mkResponse({ query: { categorymembers: [{ ns: 0, title: 'c' }] } });
      }
      return mkResponse({ query: { categorymembers: [] } });
    });

    const titles = await walkCategoryTree('he.wikipedia.org', 'קטגוריה:root', {
      fetcher,
      maxDepth: 1,
    });
    expect(titles.sort()).toEqual(['a', 'b'].sort());
    expect(visited).not.toContain('קטגוריה:lvl2');
  });

  it('dedupes titles seen via multiple paths', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      const cat = decodeURIComponent((/cmtitle=([^&]+)/.exec(url)?.[1] ?? '').replace(/\+/g, ' '));
      const isSubcatQuery = url.includes('cmtype=subcat');
      if (cat === 'קטגוריה:root') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [{ ns: 14, title: 'קטגוריה:A' }, { ns: 14, title: 'קטגוריה:B' }] } });
        return mkResponse({ query: { categorymembers: [] } });
      }
      if (cat === 'קטגוריה:A' || cat === 'קטגוריה:B') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [] } });
        return mkResponse({ query: { categorymembers: [{ ns: 0, title: 'shared' }] } });
      }
      return mkResponse({ query: { categorymembers: [] } });
    });

    const titles = await walkCategoryTree('he.wikipedia.org', 'קטגוריה:root', {
      fetcher,
      maxDepth: 1,
    });
    expect(titles).toEqual(['shared']);
  });

  it('skips a failing subcategory when skipOnError=true', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      const cat = decodeURIComponent((/cmtitle=([^&]+)/.exec(url)?.[1] ?? '').replace(/\+/g, ' '));
      const isSubcatQuery = url.includes('cmtype=subcat');
      if (cat === 'קטגוריה:root') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [{ ns: 14, title: 'קטגוריה:bad' }, { ns: 14, title: 'קטגוריה:good' }] } });
        return mkResponse({ query: { categorymembers: [] } });
      }
      if (cat === 'קטגוריה:bad') {
        return new Response('err', { status: 500 });
      }
      if (cat === 'קטגוריה:good') {
        if (isSubcatQuery) return mkResponse({ query: { categorymembers: [] } });
        return mkResponse({ query: { categorymembers: [{ ns: 0, title: 'ok' }] } });
      }
      return mkResponse({ query: { categorymembers: [] } });
    });

    const titles = await walkCategoryTree('he.wikipedia.org', 'קטגוריה:root', {
      fetcher,
      maxDepth: 1,
      skipOnError: true,
    });
    expect(titles).toEqual(['ok']);
  });

  it('respects maxCategories cap', async () => {
    let callsToSubcat = 0;
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      const isSubcatQuery = url.includes('cmtype=subcat');
      if (isSubcatQuery) {
        callsToSubcat++;
        return mkResponse({
          query: { categorymembers: Array.from({ length: 10 }, (_, i) => ({ ns: 14, title: `קטגוריה:sub${callsToSubcat}-${i}` })) },
        });
      }
      return mkResponse({ query: { categorymembers: [] } });
    });

    await walkCategoryTree('he.wikipedia.org', 'קטגוריה:root', {
      fetcher,
      maxDepth: 5,
      maxCategories: 3,
    });
    expect(callsToSubcat).toBeLessThanOrEqual(3);
  });
});
