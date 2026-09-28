/**
 * /singleplayer LCP must be a server-rendered raw <img>, not next/image
 * inside the ssr:false PageClient bailout. Guarded so a future edit cannot
 * silently put winner.webp back behind JS (PSI render delay 4–6s).
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SinglePlayerLcpShell } from '@/components/singleplayer/SinglePlayerLcpShell';

vi.mock('@/translations/loadTranslation', () => ({
  loadTranslation: async () => ({
    seo: {
      locale: 'en_US',
      singleplayer: {
        title: 'SP',
        description: 'd',
        ogTitle: 'og',
        ogDescription: 'ogd',
      },
    },
  }),
}));

import SinglePlayerLayout from '../layout';

describe('singleplayer LCP shell (server HTML)', () => {
  it('paints winner.webp as a raw img (not next/image, not client-only)', () => {
    const html = renderToStaticMarkup(<SinglePlayerLcpShell />);
    expect(html).toContain('id="sp-lcp-paint"');
    expect(html).toMatch(/src="\/mascot\/winner\.webp"/);
    expect(html).toMatch(/fetchPriority="high"/);
    expect(html).not.toContain('data-nimg');
  });

  it('is mounted from the route layout so it survives the ssr:false swap', async () => {
    const tree = await SinglePlayerLayout({
      children: <div data-testid="sp-child" />,
      params: Promise.resolve({ locale: 'en' }),
    });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('id="sp-lcp-paint"');
    expect(html).toMatch(/rel="preload"[^>]*href="\/mascot\/winner\.webp"/);
    expect(html).toContain('data-testid="sp-child"');
  });
});
