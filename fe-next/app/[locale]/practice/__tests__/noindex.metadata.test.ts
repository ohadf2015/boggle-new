import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

/**
 * AdSense "low value content" sweep (2026-06-17, founder-authorised):
 * The /practice hub is an interactive-only page (mode cards + CTA, ~200 words of
 * visible prose) that was serving index,follow in prod. Thin interactive pages drag
 * the domain content-quality average below AdSense's bar. Noindexed so the crawler
 * samples only our rich pages. Reversible if we later invest in real prose here.
 * Spec: docs/2026-06-17-adsense-thin-page-noindex-spec.md
 */
describe('/practice hub metadata — noindexed (thin interactive page)', () => {
  const meta = (locale: string) =>
    generateMetadata({ params: Promise.resolve({ locale }) });

  it('is index:false for the EN hub', async () => {
    const m = await meta('en');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('stays index:false for non-EN locales', async () => {
    const m = await meta('he');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('keeps follow:true so internal links still pass crawl signal', async () => {
    const m = await meta('en');
    expect(m.robots).toMatchObject({ follow: true });
  });
});
