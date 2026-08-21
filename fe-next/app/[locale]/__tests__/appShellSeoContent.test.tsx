// @vitest-environment happy-dom
/**
 * /brain and /multiplayer are app-shell routes: their PageClient is client-only,
 * so a crawler (and a human AdSense reviewer) that does not execute the app JS saw
 * nav + footer chrome and nothing else — measured 2026-08-21 against production:
 * /en/brain 27 visible words, /en/multiplayer 36, against a site median of 888.
 *
 * Both files already carried authored per-locale copy; it only ever reached JSON-LD
 * metadata, never the rendered page. These tests pin that the copy is in the SSR
 * output even when the client half renders nothing — which is exactly the crawler's
 * view, hence the deliberate PageClient stub. Remove the GamePageSeoContent call
 * from either page and these fail.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Stand in for the client-only app shell: renders nothing, like a crawler sees.
vi.mock('../brain/PageClient', () => ({ default: () => null }));
vi.mock('../multiplayer/PageClient', () => ({ default: () => null }));

import BrainPage from '../brain/page';
import MultiplayerPage from '../multiplayer/page';

const renderPage = async (
  Page: (p: { params: Promise<{ locale: string }> }) => Promise<React.JSX.Element>,
  locale: string
) => {
  const { container } = render(await Page({ params: Promise.resolve({ locale }) }));
  // Strip JSON-LD on a CLONE: metadata is not what a reviewer reads, and it was
  // never the gap. Mutating the live container breaks React's own unmount.
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script').forEach((s) => s.remove());
  return clone.textContent ?? '';
};

describe('app-shell routes ship publisher content in the SSR HTML', () => {
  it('/brain renders its authored features and FAQ, not just JSON-LD', async () => {
    const text = await renderPage(BrainPage, 'en');
    expect(text).toContain('Memory Hunt');
    expect(text).toContain('Lightning Round');
    // The FAQ answers were authored in this file and previously rendered nowhere.
    expect(text).toContain('Are these brain training word games free?');
    expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThan(150);
  });

  it('/multiplayer renders its authored description', async () => {
    const text = await renderPage(MultiplayerPage, 'en');
    expect(text).toContain('Wheel Rush');
    expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThan(100);
  });

  it('falls back to English copy for a locale with no authored content', async () => {
    // `ru` exists in multiplayer's map but not brain's — brain must not render empty.
    const text = await renderPage(BrainPage, 'ru');
    expect(text).toContain('Memory Hunt');
  });

  it('renders the Spanish copy for es, not the English fallback', async () => {
    const text = await renderPage(BrainPage, 'es');
    expect(text).toContain('Caza de memoria');
    expect(text).not.toContain('Memory Hunt');
  });
});
