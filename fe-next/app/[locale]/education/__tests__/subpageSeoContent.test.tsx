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

  // NOTE ON SCOPE: PageClient is stubbed to null above, so these assertions see the SERVER
  // output only and CANNOT observe an h1 that the client half renders after hydration. That
  // is why the two pages differ, and why the difference is asserted rather than assumed:
  //   - classroom-game: client tree (ClassroomGameLobby, EducationHeader) emits no h1 in any
  //     state, so the page had none at all -> asH1 supplies the missing one.
  //   - duels: PageClient.tsx:114 renders <DuelHistory>, DuelHistory.tsx:127 emits an h1, so
  //     asH1 would give a signed-in student two. Server output must stay at 0.
  // A test cannot prove the client claim while the client is stubbed; the guard below pins
  // the server side, and the static assertion after it pins the reason.
  it('/classroom-game supplies the h1 the page never had', async () => {
    const { container } = await renderPage(ClassroomPage, 'en');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('/duels does NOT claim an h1 — its client half already renders one', async () => {
    const { container } = await renderPage(DuelsPage, 'en');
    expect(container.querySelectorAll('h1')).toHaveLength(0);
  });

  it('duels still routes through a client component that emits an h1', async () => {
    // Pins the premise of the assertion above. If DuelHistory ever stops rendering an h1,
    // or duels stops rendering DuelHistory, this fails and asH1 should be reconsidered.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const pageClient = readFileSync(
      join(process.cwd(), 'app/[locale]/education/duels/PageClient.tsx'),
      'utf8'
    );
    const duelHistory = readFileSync(
      join(process.cwd(), 'components/education/duels/DuelHistory.tsx'),
      'utf8'
    );
    expect(pageClient).toMatch(/<DuelHistory\b/);
    expect(duelHistory).toMatch(/<h1\b/);
  });
});
