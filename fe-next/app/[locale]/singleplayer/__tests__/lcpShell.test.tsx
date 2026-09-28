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
  it('paints winner-lcp.webp as a raw img (not next/image, not client-only)', () => {
    const html = renderToStaticMarkup(<SinglePlayerLcpShell />);
    expect(html).toContain('id="sp-lcp-paint"');
    expect(html).toMatch(/src="\/mascot\/winner-lcp\.webp"/);
    expect(html).toMatch(/fetchPriority="high"/);
    expect(html).not.toContain('data-nimg');
    expect(html).not.toMatch(/src="\/mascot\/winner\.webp"/);
  });

  it('is mounted from the route layout so it survives the ssr:false swap', async () => {
    const tree = await SinglePlayerLayout({
      children: <div data-testid="sp-child" />,
      params: Promise.resolve({ locale: 'en' }),
    });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('id="sp-lcp-paint"');
    expect(html).toMatch(/rel="preload"[^>]*href="\/mascot\/winner-lcp\.webp"/);
    expect(html).toContain('data-testid="sp-child"');
  });

  it('ships a still LCP asset well under the 148KB animated winner.webp', async () => {
    const { stat } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const info = await stat(join(__dirname, '../../../../public/mascot/winner-lcp.webp'));
    expect(info.size).toBeGreaterThan(500);
    expect(info.size).toBeLessThan(25 * 1024);
  });
});
