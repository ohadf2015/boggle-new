import { describe, it, expect, vi, beforeEach } from 'vitest';

const base = vi.hoisted(() => ({
  title: 'Player Profile & Game Stats | LexiClash',
  description: 'desc',
  openGraph: { title: 'Player Profile - LexiClash', url: 'u', images: [{ url: 'img' }] },
  twitter: { card: 'summary_large_image', title: 'Player Profile - LexiClash', images: ['img'] },
  robots: { index: true, follow: true },
}));
const generatePageMetadata = vi.hoisted(() => vi.fn(async () => base));
vi.mock('@/lib/seo/generatePageMetadata', () => ({ generatePageMetadata }));
const loadTranslation = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@/translations/loadTranslation', () => ({ loadTranslation }));

import { buildPlayerProfileMetadata } from '../profileMetadata';

beforeEach(() => {
  generatePageMetadata.mockClear();
  loadTranslation.mockReset();
  loadTranslation.mockResolvedValue({});
});

describe('buildPlayerProfileMetadata', () => {
  it('Given no public name, Then it returns the generic profile metadata unchanged', async () => {
    const meta = await buildPlayerProfileMetadata({ locale: 'en', path: '/player/x', name: null });
    expect(meta).toEqual(base);
    expect(generatePageMetadata).toHaveBeenCalledWith({ seoKey: 'playerProfile', path: '/player/x', locale: 'en' });
  });

  it('Given a public name, Then title, og and twitter titles name the player and robots stay as before', async () => {
    const meta = await buildPlayerProfileMetadata({ locale: 'en', path: '/player/x', name: 'Dana' });
    expect(meta.title).toEqual({ absolute: 'Dana on LexiClash' });
    expect(meta.openGraph?.title).toBe('Dana on LexiClash');
    expect(meta.twitter?.title).toBe('Dana on LexiClash');
    expect(meta.openGraph?.images).toEqual(base.openGraph.images);
    expect(meta.robots).toEqual(base.robots);
  });

  it('Given a translated title, Then it uses the locale copy', async () => {
    loadTranslation.mockResolvedValue({ brag2: { profile: { metaTitle: '{name} ב-LexiClash' } } });
    const meta = await buildPlayerProfileMetadata({ locale: 'he', path: '/player/x', name: 'דנה' });
    expect(meta.title).toEqual({ absolute: 'דנה ב-LexiClash' });
  });
});
