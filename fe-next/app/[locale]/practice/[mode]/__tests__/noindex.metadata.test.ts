import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

/**
 * AdSense "low value content" sweep (2026-06-17, founder-authorised):
 * /practice/[mode] pages (classic, wordHunt, wheelRush) are interactive-only with
 * minimal visible prose and were serving index,follow in prod across 5 locales
 * (15 thin pages). Noindexed to shrink the thin-page crawl sample.
 * Spec: docs/2026-06-17-adsense-thin-page-noindex-spec.md
 */
describe('/practice/[mode] metadata — noindexed (thin interactive pages)', () => {
  const meta = (locale: string, mode: string) =>
    generateMetadata({ params: Promise.resolve({ locale, mode }) });

  it('is index:false for a valid EN mode', async () => {
    const m = await meta('en', 'classic');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('stays index:false for non-EN locales', async () => {
    const m = await meta('es', 'wordHunt');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('is index:false for an invalid mode (falls back to practice hub meta)', async () => {
    const m = await meta('en', 'not-a-mode');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('keeps follow:true so internal links still pass crawl signal', async () => {
    const m = await meta('en', 'classic');
    expect(m.robots).toMatchObject({ follow: true });
  });
});
