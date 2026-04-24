import { describe, it, expect, vi } from 'vitest';
import {
  fetchPageCategories,
  hasRejectedCategory,
  HE_REJECT_CATEGORY_PATTERNS,
} from '../wikiCategoryFilter';

const mkResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('hasRejectedCategory', () => {
  it('returns true when any category matches a reject pattern', () => {
    const cats = ['ילידי 1942', 'זמרי ישראל', 'אישים חיים'];
    expect(hasRejectedCategory(cats, HE_REJECT_CATEGORY_PATTERNS)).toBe(true);
  });

  it('returns false when no category matches', () => {
    const cats = ['מאכלים איטלקיים', 'גבינות'];
    expect(hasRejectedCategory(cats, HE_REJECT_CATEGORY_PATTERNS)).toBe(false);
  });

  it('rejects award / film / album / location taxonomies', () => {
    expect(hasRejectedCategory(['זוכי פרס נובל'], HE_REJECT_CATEGORY_PATTERNS)).toBe(true);
    expect(hasRejectedCategory(['סרטים משנת 1997'], HE_REJECT_CATEGORY_PATTERNS)).toBe(true);
    expect(hasRejectedCategory(['אלבומי פופ'], HE_REJECT_CATEGORY_PATTERNS)).toBe(true);
    expect(hasRejectedCategory(['ערי ישראל'], HE_REJECT_CATEGORY_PATTERNS)).toBe(true);
    expect(hasRejectedCategory(['יישובים במרכז הארץ'], HE_REJECT_CATEGORY_PATTERNS)).toBe(true);
  });

  it('accepts topical taxonomies (foods, sport gear, plants)', () => {
    expect(hasRejectedCategory(['מאכלים סיניים'], HE_REJECT_CATEGORY_PATTERNS)).toBe(false);
    expect(hasRejectedCategory(['ציוד ספורט'], HE_REJECT_CATEGORY_PATTERNS)).toBe(false);
    expect(hasRejectedCategory(['צמחי בר'], HE_REJECT_CATEGORY_PATTERNS)).toBe(false);
  });
});

describe('fetchPageCategories', () => {
  it('returns empty map for empty title list without calling fetcher', async () => {
    const fetcher = vi.fn();
    const out = await fetchPageCategories('he.wikipedia.org', [], { fetcher });
    expect(out.size).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('parses formatversion=2 response into title→categories map', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      mkResponse({
        query: {
          pages: [
            {
              title: 'חומץ בלסמי',
              categories: [
                { ns: 14, title: 'קטגוריה:מאכלים איטלקיים' },
                { ns: 14, title: 'קטגוריה:תבלינים' },
              ],
            },
            {
              title: 'ריק אסטלי',
              categories: [
                { ns: 14, title: 'קטגוריה:זמרי פופ בריטים' },
                { ns: 14, title: 'קטגוריה:ילידי 1966' },
              ],
            },
          ],
        },
      }),
    );
    const out = await fetchPageCategories(
      'he.wikipedia.org',
      ['חומץ בלסמי', 'ריק אסטלי'],
      { fetcher },
    );
    expect(out.get('חומץ בלסמי')).toEqual(['מאכלים איטלקיים', 'תבלינים']);
    expect(out.get('ריק אסטלי')).toEqual(['זמרי פופ בריטים', 'ילידי 1966']);
  });

  it('batches titles in groups of 50', async () => {
    const titles = Array.from({ length: 120 }, (_, i) => `T${i}`);
    const fetcher = vi.fn().mockImplementation(async () => mkResponse({ query: { pages: [] } }));
    await fetchPageCategories('he.wikipedia.org', titles, { fetcher });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('follows clcontinue pagination within a batch', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        mkResponse({
          query: {
            pages: [{ title: 'A', categories: [{ ns: 14, title: 'קטגוריה:X' }] }],
          },
          continue: { clcontinue: 'A|Y' },
        }),
      )
      .mockResolvedValueOnce(
        mkResponse({
          query: {
            pages: [{ title: 'A', categories: [{ ns: 14, title: 'קטגוריה:Y' }] }],
          },
        }),
      );
    const out = await fetchPageCategories('he.wikipedia.org', ['A'], { fetcher });
    expect(out.get('A')).toEqual(['X', 'Y']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('throws on non-ok response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(
      fetchPageCategories('he.wikipedia.org', ['A'], { fetcher }),
    ).rejects.toThrow(/500/);
  });
});
