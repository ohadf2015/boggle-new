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

  // REVERSAL (2026-07-02): per-date Word-of-the-Day pages were kept in the
  // 06-04 round on the theory that curated definitions are "genuine text".
  // AdSense then rejected the site for "low value content" WITH them indexed;
  // live measurement shows each renders ~216 crawlable words (mostly template).
  // 106 near-identical URLs (~17% of the sitemap) drag the domain average.
  // Now noindex + de-sitemapped; the /word-of-the-day hub keeps all the words.
  it('does NOT list per-date word-of-the-day child URLs (thin, now noindex)', () => {
    const wotdDateUrls = routes.filter((r) =>
      /\/word-of-the-day\/\d{4}-\d{2}-\d{2}$/.test(r.url)
    );
    expect(wotdDateUrls.length).toBe(0);
  });

  it('still lists the /word-of-the-day hub for every locale', () => {
    for (const locale of LOCALES) {
      expect(
        routes.find((r) => r.url === `${BASE_URL}/${locale}/word-of-the-day`),
        `missing word-of-the-day hub for ${locale}`
      ).toBeDefined();
    }
  });

  // AdSense round 2 (2026-07-02): near-empty game shells measured live at
  // 30-282 crawlable words. Noindexed at page level; must not be advertised.
  // Content-rich siblings (/word-craft-game, /daily-word-wheel, /guides/*)
  // stay indexed and cover the search intent.
  it('does NOT list near-empty game shells (/blast, /word-craft, daily sub-shells, brain drills)', () => {
    const shells = routes.filter((r) =>
      /\/(blast|word-craft|daily\/word-hunt|daily\/word-wheel|brain\/drills\/)([^-]|$)/.test(r.url)
    );
    expect(
      shells.map((r) => r.url),
      'thin game shells must not appear in the sitemap'
    ).toEqual([]);
  });

  it('still lists the content-rich game siblings (/word-craft-game, /daily, /brain hubs)', () => {
    for (const path of ['/word-craft-game', '/daily', '/brain']) {
      expect(
        routes.find((r) => r.url === `${BASE_URL}/en${path}`),
        `missing ${path} for en`
      ).toBeDefined();
    }
  });

  // Adventure is BETA-gated (PageClient redirects non-beta users away) —
  // public visitors and the AdSense reviewer hit a wall. Out of the sitemap
  // and noindexed until GA. Restore both when the BETA badge drops.
  it('does NOT list /adventure while it is beta-gated', () => {
    const adventureUrls = routes.filter((r) => /\/adventure$/.test(r.url));
    expect(adventureUrls.map((r) => r.url)).toEqual([]);
  });

  // Connections is LIVE with a real content hub (en+he landing copy in
  // content.ts; other locales are noindex → canonical en). It was missing
  // from the sitemap entirely.
  it('lists /connections for its supported landing locales (en, he)', () => {
    for (const locale of ['en', 'he']) {
      expect(
        routes.find((r) => r.url === `${BASE_URL}/${locale}/connections`),
        `missing /connections for ${locale}`
      ).toBeDefined();
    }
    const others = routes.filter((r) => /\/(sv|ja|es|ru)\/connections$/.test(r.url));
    expect(others.map((r) => r.url), 'non-supported connections locales are noindexed').toEqual([]);
  });

  // Blast is a LIVE mode whose play route is a noindexed shell; this landing
  // is its indexable keyword surface (English body → EN-only emission, same
  // convention as the comparison pages).
  it('lists the /word-blast-game landing for en only', () => {
    expect(
      routes.find((r) => r.url === `${BASE_URL}/en/word-blast-game`),
      'missing /en/word-blast-game'
    ).toBeDefined();
    const nonEn = routes.filter((r) => /\/(he|sv|ja|es|ru)\/word-blast-game$/.test(r.url));
    expect(nonEn.map((r) => r.url)).toEqual([]);
  });

  // /ru/blog/* serves the English article body (0 of 28 articles have a ru
  // translation → hasTranslation noindexes them). Advertising noindex'd
  // duplicate-content URLs in the sitemap is a pure negative signal.
  it('does NOT list Russian blog article URLs (untranslated → noindex)', () => {
    const ruBlogArticles = routes.filter((r) =>
      /\/ru\/blog\/.+/.test(r.url)
    );
    expect(ruBlogArticles.map((r) => r.url)).toEqual([]);
  });

  it('still lists blog articles for translated locales', () => {
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(
        routes.find((r) => r.url === `${BASE_URL}/${locale}/blog/boggle-vs-wordle`),
        `missing boggle-vs-wordle blog article for ${locale}`
      ).toBeDefined();
    }
  });
});
