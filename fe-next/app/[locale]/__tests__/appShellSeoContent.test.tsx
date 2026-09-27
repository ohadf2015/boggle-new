// @vitest-environment happy-dom
/**
 * HISTORY (2026-08-21): /brain, /multiplayer and /daily are app-shell routes whose
 * PageClient is client-only, so a crawler saw nav + footer chrome and nothing else.
 * Each page grew a visible marketing/FAQ card (GamePageSeoContent / HomepageContentSection)
 * rendered from copy that until then only reached JSON-LD.
 *
 * REVERSED (2026-08-27, user request): "this should take the whole screen and not show
 * the faq in any game related screen including main lobby". The card was a sibling flex
 * child of the lobby's `flex-1` root inside `body.screen-fit` (min-height:100dvh), so its
 * presence is exactly what stopped the lobby filling the viewport — the same complaint as
 * 2026-08-08, when it was capped at 60dvh instead of removed.
 *
 * These tests pin the ABSENCE on play surfaces so a future SEO pass cannot silently
 * re-add it. The copy itself is untouched in each page's `seoContent` map and still feeds
 * <meta> + JSON-LD, and the dedicated landing pages (/multiplayer-word-game-online,
 * /brain-training-word-games, /faq, /how-to-play, /rules) still render it visibly.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Stand in for the client-only app shell: renders nothing, like a crawler sees.
vi.mock('../brain/PageClient', () => ({ default: () => null }));
vi.mock('../multiplayer/PageClient', () => ({ default: () => null }));
vi.mock('@/components/daily/DailyRedirect', () => ({ default: () => null }));

import BrainPage from '../brain/page';
import MultiplayerPage from '../multiplayer/page';
import DailyPage from '../daily/page';

type ServerPage = (p: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) => Promise<React.JSX.Element>;

const renderPage = async (Page: ServerPage, locale: string) => {
  const { container } = render(
    await Page({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) })
  );
  // Strip JSON-LD on a CLONE: the copy is SUPPOSED to survive there, it is the
  // rendered page we are asserting about. Mutating the live container breaks unmount.
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script').forEach((s) => s.remove());
  return clone;
};

describe('play surfaces render no marketing/FAQ card', () => {
  it('/multiplayer (the main lobby) ships no SEO section', async () => {
    const el = await renderPage(MultiplayerPage as ServerPage, 'en');
    expect(el.querySelector('section')).toBeNull();
    expect(el.querySelector('details')).toBeNull();
    expect(el.textContent).not.toContain('Wheel Rush');
  });

  it('/multiplayer stays clean in Hebrew too (the reported screen)', async () => {
    const el = await renderPage(MultiplayerPage as ServerPage, 'he');
    expect(el.querySelector('details')).toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });

  it('/brain ships no SEO section', async () => {
    const el = await renderPage(BrainPage as ServerPage, 'en');
    expect(el.querySelector('section')).toBeNull();
    expect(el.textContent).not.toContain('Memory Hunt');
    expect(el.textContent).not.toContain('Are these brain training word games free?');
  });

  it('/daily ships no SEO section', async () => {
    const el = await renderPage(DailyPage as ServerPage, 'en');
    expect(el.querySelector('section')).toBeNull();
    expect(el.querySelector('details')).toBeNull();
  });

  it('the copy still exists for <meta>/JSON-LD — removal was render-only', async () => {
    const { container } = render(
      await (MultiplayerPage as ServerPage)({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve({}),
      })
    );
    const jsonLd = Array.from(container.querySelectorAll('script'))
      .map((s) => s.textContent ?? '')
      .join(' ');
    expect(jsonLd).toContain('Wheel Rush');
  });
});
