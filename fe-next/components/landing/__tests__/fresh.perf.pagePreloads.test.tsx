/**
 * Piece D (perf): the homepage server component must not preload images a
 * fresh visitor never sees.
 *
 * `/mascot/winner.webp` (148KB) and `/modes/cubes/arena.png` belonged to the
 * returning-user tree (hero mascot + anchor mode cube). Fresh visitors land on
 * the fresh page, whose LCP is the h1 / HeroGrid, so those two high-priority
 * preloads only competed with the real first paint for bandwidth.
 *
 * Rendered with renderToStaticMarkup so the assertion reads exactly the
 * server HTML the page contributes.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/app/[locale]/PageClient', () => ({
  __esModule: true,
  default: () => <div data-testid="home-client" />,
}));
vi.mock('@/lib/landing/fetchLandingData', () => ({
  fetchLandingData: vi.fn(async () => undefined),
}));
vi.mock('@/components/seo/HomepageContentSection', () => ({
  HomepageContentSection: () => <section data-testid="home-content" />,
}));
vi.mock('@/components/seo/EsScrabbleCrossLink', () => ({ EsScrabbleCrossLink: () => null }));
vi.mock('@/components/seo/SvScrabbleCrossLink', () => ({ SvScrabbleCrossLink: () => null }));
vi.mock('@/components/seo/EnBoggleCrossLink', () => ({ EnBoggleCrossLink: () => null }));

import HomePage from '@/app/[locale]/(home)/page';

async function serverHtml(locale: string): Promise<string> {
  const tree = await HomePage({ params: Promise.resolve({ locale }) });
  return renderToStaticMarkup(tree);
}

describe('homepage server preloads (fresh visitor)', () => {
  it('shouldNotPreloadTheReturningHeroMascot', async () => {
    // GIVEN the homepage server render
    const html = await serverHtml('en');
    // THEN winner.webp is not preloaded (fresh visitors never see it)
    expect(html).not.toMatch(/rel="preload"[^>]*winner\.webp/);
  });

  it('shouldNotPreloadTheAnchorModeCube', async () => {
    const html = await serverHtml('he');
    expect(html).not.toMatch(/rel="preload"[^>]*arena\.png/);
  });

  it('shouldEmitNoImagePreloadsAtAll', async () => {
    // The fresh LCP is text + CSS tiles; any image preload here is a guess
    // about a tree the visitor may not get.
    const html = await serverHtml('en');
    expect(html).not.toMatch(/<link[^>]*rel="preload"[^>]*as="image"/);
  });

  it('shouldKeepTheFaqJsonLdAndPageContent', async () => {
    // Must-survive: one FaqPage JSON-LD + the visible content section.
    const html = await serverHtml('en');
    expect(html.match(/"@type":"FAQPage"/g)?.length ?? 0).toBe(1);
    expect(html).toContain('data-testid="home-content"');
    expect(html).toContain('data-testid="home-client"');
  });
});
