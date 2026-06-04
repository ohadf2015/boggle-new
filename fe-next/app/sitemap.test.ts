import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';

const LOCALES = ['he', 'en', 'sv', 'ja', 'es'] as const;
const BASE_URL = 'https://www.lexiclash.live';

describe('sitemap', () => {
  const routes = sitemap();

  it('registers the Android download landing page for every locale', () => {
    for (const locale of LOCALES) {
      const url = `${BASE_URL}/${locale}/download-word-game-android`;
      const entry = routes.find((r) => r.url === url);
      expect(entry, `missing sitemap entry for ${url}`).toBeDefined();
      // hreflang cluster present
      expect(entry?.alternates?.languages).toBeDefined();
    }
  });

  // AdSense low-value-content remediation (2026-06-04):
  // Thin per-date pages are now noindex; they must NOT be advertised in the sitemap.
  // Advertising noindex'd URLs wastes crawl budget and signals a programmatic-SEO
  // footprint. The hubs (/daily/archive, /word-of-the-day) stay; the per-date
  // archive children are dropped. See docs/2026-06-04-adsense-approval-plan.md.
  it('does NOT list per-date daily-archive child URLs (thin, now noindex)', () => {
    const archiveDateUrls = routes.filter((r) =>
      /\/daily\/archive\/\d{4}-\d{2}-\d{2}$/.test(r.url)
    );
    expect(
      archiveDateUrls.length,
      `expected 0 per-date archive URLs, found ${archiveDateUrls.length}`
    ).toBe(0);
  });

  it('still lists the /daily/archive hub for every locale', () => {
    for (const locale of LOCALES) {
      const url = `${BASE_URL}/${locale}/daily/archive`;
      expect(
        routes.find((r) => r.url === url),
        `missing archive hub for ${locale}`
      ).toBeDefined();
    }
  });

  // Word-of-the-Day per-date pages are KEPT: each is a curated word with
  // definition/usage — genuine dictionary-style text content (the kind AdSense
  // wants), not a thin stat snapshot. Guard that we didn't accidentally cull them.
  it('still lists curated word-of-the-day content (kept — genuine text)', () => {
    const wotdDateUrls = routes.filter((r) =>
      /\/word-of-the-day\/.+/.test(r.url)
    );
    expect(wotdDateUrls.length).toBeGreaterThan(0);
  });
});
