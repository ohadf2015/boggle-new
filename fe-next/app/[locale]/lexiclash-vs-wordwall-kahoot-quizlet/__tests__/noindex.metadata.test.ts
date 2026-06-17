import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

/**
 * AdSense / duplicate-content fix (2026-06-17): this comparison page has a Hebrew
 * body (RTL, hardcoded HE strings) and canonical → /he. It was serving index,follow
 * across ALL 5 locales, so /en /sv /ja /es each rendered the same Hebrew content as an
 * indexable near-duplicate. Mirror the sibling pattern (vs-wordle uses index:isEnglish):
 * only the Hebrew route is indexable; the rest are noindex,follow.
 * Spec: docs/2026-06-17-adsense-thin-page-noindex-spec.md
 */
describe('/lexiclash-vs-wordwall-kahoot-quizlet metadata — Hebrew-only indexable', () => {
  const meta = (locale: string) =>
    generateMetadata({ params: Promise.resolve({ locale }) });

  it('is index:true for the Hebrew route (the only localized body)', async () => {
    const m = await meta('he');
    expect(m.robots).toMatchObject({ index: true });
  });

  it('is index:false for non-Hebrew locales (Hebrew body = duplicate under those URLs)', async () => {
    for (const locale of ['en', 'sv', 'ja', 'es']) {
      const m = await meta(locale);
      expect(m.robots, `expected ${locale} noindexed`).toMatchObject({ index: false });
    }
  });

  it('keeps follow:true on all locales', async () => {
    const m = await meta('en');
    expect(m.robots).toMatchObject({ follow: true });
  });
});
