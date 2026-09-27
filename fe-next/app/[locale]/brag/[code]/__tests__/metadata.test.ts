/**
 * A brag link is only worth sharing if it unfurls into the result image, and
 * `og:image` comes from the metadata of whatever URL is pasted. These tests pin
 * that contract: the image URL, the params forwarded to it, and noindex.
 */
import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

const meta = (code: string, sp: Record<string, string | string[] | undefined>) =>
  generateMetadata({
    params: Promise.resolve({ locale: 'en', code }),
    searchParams: Promise.resolve(sp),
  });

const ogImage = (m: Awaited<ReturnType<typeof generateMetadata>>): string => {
  const images = m.openGraph?.images;
  const first = Array.isArray(images) ? images[0] : images;
  const url = typeof first === 'object' && first !== null && 'url' in first ? first.url : first;
  return String(url);
};

describe('brag page metadata', () => {
  it('points og:image at the brag image route', async () => {
    const m = await meta('ABC123', { score: '142', rival: '118' });
    expect(ogImage(m)).toContain('/api/og/brag?');
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('forwards the result onto the image URL', async () => {
    const m = await meta('ABC123', {
      score: '142',
      rival: '118',
      name: 'Dana',
      mode: 'classic',
      words: '11',
      best: 'SPLENDID',
    });
    const q = new URL(ogImage(m)).searchParams;
    expect(q.get('score')).toBe('142');
    expect(q.get('rival')).toBe('118');
    expect(q.get('name')).toBe('Dana');
    expect(q.get('mode')).toBe('classic');
    expect(q.get('words')).toBe('11');
    expect(q.get('best')).toBe('SPLENDID');
  });

  it('forwards ONLY the fields the image understands', async () => {
    // The image URL must not become a pass-through for arbitrary query junk.
    const m = await meta('ABC123', { score: '10', evil: 'x', utm_source: 'brag_card' });
    const q = new URL(ogImage(m)).searchParams;
    expect(q.get('evil')).toBeNull();
    expect(q.get('utm_source')).toBeNull();
  });

  it('survives a repeated param without emitting an array', async () => {
    const m = await meta('ABC123', { score: ['142', '999'] });
    expect(new URL(ogImage(m)).searchParams.get('score')).toBe('142');
  });

  it('titles the page with the scoreline, and drops the dash when solo', async () => {
    expect((await meta('ABC123', { score: '142', rival: '118' })).title).toEqual({
      absolute: '142 - 118 | LexiClash',
    });
    expect((await meta('ABC123', { score: '64' })).title).toEqual({
      absolute: '64 | LexiClash',
    });
  });

  it('is never indexed — every URL is one player s single round', async () => {
    const m = await meta('ABC123', { score: '142' });
    expect(m.robots).toMatchObject({ index: false });
  });

  it('carries no emoji in any metadata string', async () => {
    const m = await meta('ABC123', { score: '142', rival: '118', name: 'Dana' });
    const blob = JSON.stringify(m);
    expect(blob).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}]/u
    );
  });
});
