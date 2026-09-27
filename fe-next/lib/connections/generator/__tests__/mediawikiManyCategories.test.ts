import { describe, it, expect, vi } from 'vitest';
import { fetchCategoryMembersMany } from '../wiktionaryApi';

const mkResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('fetchCategoryMembersMany', () => {
  it('flattens ns=0 titles across all given categories', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'חומץ בלסמי' }, { ns: 0, title: 'חומץ אורז' }] },
      }))
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'חליל פאן' }] },
      }));
    const titles = await fetchCategoryMembersMany(
      'he.wikipedia.org',
      ['קטגוריה:מאכלים', 'קטגוריה:כלי נגינה'],
      { fetcher },
    );
    expect(titles).toEqual(['חומץ בלסמי', 'חומץ אורז', 'חליל פאן']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('deduplicates titles shared across categories', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'חומץ בלסמי' }, { ns: 0, title: 'X' }] },
      }))
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'חומץ בלסמי' }, { ns: 0, title: 'Y' }] },
      }));
    const titles = await fetchCategoryMembersMany(
      'he.wikipedia.org',
      ['Cat:A', 'Cat:B'],
      { fetcher },
    );
    expect(titles).toEqual(['חומץ בלסמי', 'X', 'Y']);
  });

  it('continues to next category when one fails with skipOnError', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('nope', { status: 404 }))
      .mockResolvedValueOnce(mkResponse({
        query: { categorymembers: [{ ns: 0, title: 'ok' }] },
      }));
    const titles = await fetchCategoryMembersMany(
      'he.wikipedia.org',
      ['Cat:Missing', 'Cat:OK'],
      { fetcher, skipOnError: true },
    );
    expect(titles).toEqual(['ok']);
  });

  it('rethrows when skipOnError is not set', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(
      fetchCategoryMembersMany('he.wikipedia.org', ['Cat:A'], { fetcher }),
    ).rejects.toThrow(/500/);
  });
});
