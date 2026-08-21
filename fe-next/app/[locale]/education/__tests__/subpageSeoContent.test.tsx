// @vitest-environment happy-dom
/**
 * /education/duels and /education/classroom-game are app shells: PageClient is client-only,
 * so a crawler saw 4 and 17 visible words respectively (measured 2026-08-21 against
 * production, as Googlebot). Both pages nonetheless emitted HowTo JSON-LD describing three
 * steps that appeared nowhere on the page — Google requires HowTo markup to reflect content
 * the user can actually see, so that was a markup mismatch as well as a thin page.
 *
 * The copy was never missing: DUELS_CONTENT / CLASSROOM_CONTENT already covered all six
 * locales, and `getEducationSubpageContent` was exported for it — used until now only by
 * its own unit test. These tests pin that the same strings now reach the SSR output.
 *
 * PageClient is stubbed to render nothing, which is exactly the crawler's view. Remove the
 * GamePageSeoContent call from either page and these fail.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { getEducationSubpageContent } from '@/lib/seo/educationSubpageJsonLd';

vi.mock('../duels/PageClient', () => ({ default: () => null }));
vi.mock('../classroom-game/PageClient', () => ({ default: () => null }));

import DuelsPage from '../duels/page';
import ClassroomPage from '../classroom-game/page';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

const renderPage = async (
  Page: (p: { params: Promise<{ locale: string }> }) => Promise<React.JSX.Element>,
  locale: string
) => {
  const { container } = render(await Page({ params: Promise.resolve({ locale }) }));
  const clone = container.cloneNode(true) as HTMLElement;
  // Drop JSON-LD: the markup was never the gap, and leaving it in would let a test pass
  // on the very strings that were invisible before this change.
  clone.querySelectorAll('script').forEach((s) => s.remove());
  return { text: clone.textContent ?? '', container };
};

describe('education subpages ship their HowTo steps as visible content', () => {
  it.each([
    ['duels', DuelsPage, 'duels'],
    ['classroom-game', ClassroomPage, 'classroomGame'],
  ] as const)('/%s renders every authored step, not just JSON-LD', async (_label, Page, key) => {
    const { text } = await renderPage(Page, 'en');
    const copy = getEducationSubpageContent(key, 'en');
    expect(copy.steps).toHaveLength(3);
    for (const step of copy.steps) {
      expect(text).toContain(step.name);
      expect(text).toContain(step.text);
    }
    expect(text).toContain(copy.description);
  });

  it.each([
    ['duels', DuelsPage, 'duels'],
    ['classroom-game', ClassroomPage, 'classroomGame'],
  ] as const)('/%s renders localized copy in all 6 locales', async (_label, Page, key) => {
    for (const locale of LOCALES) {
      const { text } = await renderPage(Page, locale);
      const copy = getEducationSubpageContent(key, locale);
      expect(text).toContain(copy.name);
      expect(text).toContain(copy.steps[0].text);
    }
  });

  it.each([
    ['duels', DuelsPage],
    ['classroom-game', ClassroomPage],
  ] as const)('/%s now has exactly one h1 (it had none)', async (_label, Page) => {
    const { container } = await renderPage(Page, 'en');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });
});
