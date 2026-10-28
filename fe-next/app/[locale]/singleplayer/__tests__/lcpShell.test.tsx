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
    // Stay in the DOM; hide only after html[data-sp-ready] so results is not covered.
    expect(html).toMatch(/html\[data-sp-ready\]\s*#sp-lcp-paint\s*\{\s*display\s*:\s*none/);
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

  it('preloads the right-sized swap asset at low priority, not the shared winner.webp', async () => {
    const tree = await SinglePlayerLayout({
      children: <div />,
      params: Promise.resolve({ locale: 'en' }),
    });
    const html = renderToStaticMarkup(tree);
    const tags = html.match(/<link\b[^>]*>/g) || [];
    const swap = tags.find((tag) => tag.includes('/mascot/winner-swap.webp'));
    expect(swap).toBeTruthy();
    expect(swap).toMatch(/rel="preload"/);
    expect(swap).toMatch(/as="image"/);
    expect(swap).toMatch(/fetchPriority="low"/);
    // The shared happy mascot is 30KB. Preloading it would put those bytes
    // back on Lantern's LCP critical path.
    expect(html).not.toMatch(/href="\/mascot\/winner\.webp"/);
    expect(html).toMatch(/rel="preload"[^>]*href="\/mascot\/winner-lcp\.webp"/);
  });

  it('ships the swap asset in the 4-6KB displayed-box budget', async () => {
    const { stat } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const info = await stat(join(__dirname, '../../../../public/mascot/winner-swap.webp'));
    expect(info.size).toBeGreaterThan(4 * 1024);
    expect(info.size).toBeLessThanOrEqual(6 * 1024);
  });
});
