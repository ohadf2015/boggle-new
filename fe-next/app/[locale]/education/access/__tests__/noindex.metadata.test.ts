import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

/**
 * AdSense "low value content" sweep (2026-06-17, founder-authorised):
 * /education/access is a form/redeem page (form labels only, no prose) that was
 * serving index,follow in prod across 5 locales. Noindexed — a form page carries no
 * content value for the crawl sample. Spec: docs/2026-06-17-adsense-thin-page-noindex-spec.md
 */
describe('/education/access metadata — noindexed (form page, no prose)', () => {
  const meta = (locale: string) =>
    generateMetadata({ params: Promise.resolve({ locale }) });

  it('is index:false for EN', async () => {
    const m = await meta('en');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('stays index:false for non-EN locales', async () => {
    const m = await meta('ja');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('keeps follow:true', async () => {
    const m = await meta('en');
    expect(m.robots).toMatchObject({ follow: true });
  });
});
