import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

/**
 * Founder-authorised 2026-06-08: the programmatic /anagram/[letters] family is a
 * FAILED SEO experiment — 127 indexed pages, 0 clicks / 0% CTR over 28d, and the
 * thin-page-with-impressions-no-engagement pattern that hurts AdSense approval.
 * The whole family is noindexed (index:false) regardless of locale. Reversible:
 * restore `index: locale === 'en'` and Google re-crawls.
 */
describe('/anagram/[letters] metadata — noindexed family', () => {
  const meta = (locale: string, letters: string) =>
    generateMetadata({ params: Promise.resolve({ locale, letters }) });

  it('is index:false for the EN page (was the only indexed locale)', async () => {
    const m = await meta('en', 'abcr');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('stays index:false for non-EN locales', async () => {
    const m = await meta('he', 'abcr');
    expect(m.robots).toMatchObject({ index: false });
  });

  it('keeps follow:true so outbound links still pass crawl signal', async () => {
    const m = await meta('en', 'abcr');
    expect(m.robots).toMatchObject({ follow: true });
  });
});
