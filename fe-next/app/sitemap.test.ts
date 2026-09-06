import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';
import { RU_LANDINGS } from '../components/landing/RuLandingLinks';
import { SUPPORTED_LANDING_LOCALES as CONNECTIONS_LANDING_LOCALES } from './[locale]/connections/content';

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

  // Teacher Pro pricing is the site's only revenue surface — it must be
  // crawlable from the sitemap. Fully SSR'd with Product+Offer JSON-LD
  // (added 2026-07-29 after finding it missing entirely).
  it('lists /teacher/upgrade for every supported locale', () => {
    for (const locale of ['he', 'en', 'sv', 'ja', 'es', 'ru']) {
      const entry = routes.find((r) => r.url === `${BASE_URL}/${locale}/teacher/upgrade`);
      expect(entry, `missing /teacher/upgrade for ${locale}`).toBeDefined();
      expect(entry?.alternates?.languages).toBeDefined();
    }
  });

  it('lists /pricing for every supported locale', () => {
    for (const locale of ['he', 'en', 'sv', 'ja', 'es', 'ru']) {
      const entry = routes.find((r) => r.url === `${BASE_URL}/${locale}/pricing`);
      expect(entry, `missing /pricing for ${locale}`).toBeDefined();
      expect(entry?.alternates?.languages).toBeDefined();
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
  // Emission is derived from SUPPORTED_LANDING_LOCALES, not restated here —
  // a restated list is exactly how page.tsx, content.ts and this file drifted
  // apart in the first place (hreflang advertised sv/ja/es while they were
  // noindexed). Assert the *relationship*: listed iff it has landing copy.
  it('lists /connections for exactly the locales with landing copy', () => {
    for (const locale of CONNECTIONS_LANDING_LOCALES) {
      expect(
        routes.find((r) => r.url === `${BASE_URL}/${locale}/connections`),
        `missing /connections for ${locale}`
      ).toBeDefined();
    }
    const emitted = routes
      .filter((r) => r.url.endsWith('/connections'))
      .map((r) => r.url.split('/').at(-2));
    expect([...emitted].sort(), 'no /connections URL without landing copy').toEqual(
      [...CONNECTIONS_LANDING_LOCALES].sort()
    );
  });

  // The RU keyword cluster is only worth anything if all three agree: a route
  // exists, the sitemap lists it, and its siblings link to it. Google has never
  // crawled these (URL Inspection: "URL is unknown to Google", 2026-08-09), so
  // internal links are the discovery path that actually matters.
  it('keeps the RU landing cluster, its routes and the sitemap in sync', () => {
    for (const { slug } of RU_LANDINGS) {
      expect(
        existsSync(join(__dirname, '[locale]', slug, 'page.tsx')),
        `RuLandingLinks points at /${slug} but no route exists`
      ).toBe(true);

      const ruUrl = `${BASE_URL}/ru/${slug}`;
      expect(routes.find((r) => r.url === ruUrl), `sitemap is missing ${ruUrl}`).toBeDefined();

      const leaked = routes.filter(
        (r) => r.url.endsWith(`/${slug}`) && !r.url.startsWith(`${BASE_URL}/ru/`)
      );
      expect(
        leaked.map((r) => r.url),
        `/${slug} is Russian-only — it must not be emitted for other locales`
      ).toEqual([]);
    }
  });

  it('gives every /connections URL hreflang covering all landing locales', () => {
    const en = routes.find((r) => r.url === `${BASE_URL}/en/connections`);
    const langs = en?.alternates?.languages ?? {};
    for (const locale of CONNECTIONS_LANDING_LOCALES) {
      expect(langs[locale], `missing hreflang ${locale}`).toBe(
        `${BASE_URL}/${locale}/connections`
      );
    }
    expect(langs['x-default']).toBe(`${BASE_URL}/en/connections`);
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

  // /ru/blog/* is listed ONLY for articles with a native ru translation
  // (hasTranslation indexes them). Untranslated articles serve the English
  // body noindexed — advertising those in the sitemap is a pure negative
  // signal (AdSense "low value content", 2026-07-02).
  it('lists Russian blog articles ONLY for ru-translated slugs', () => {
    const RU_TRANSLATED = [
      'word-games-for-brain-training',
      'free-word-games-online',
      'vocabulary-building-strategies',
      'improve-word-game-skills',
      '10-surprising-benefits-word-games',
      'science-behind-word-games',
      'why-word-games-are-addictive',
      'word-games-and-mental-health',
      'multilingual-word-learning',
      'word-game-history',
      'word-games-for-kids-education',
      'daily-challenge-strategies',
      'multiplayer-word-games-social',
      'top-player-secrets',
    ];
    for (const slug of RU_TRANSLATED) {
      expect(
        routes.find((r) => r.url === `${BASE_URL}/ru/blog/${slug}`),
        `missing ru blog article ${slug}`
      ).toBeDefined();
    }
    const unexpected = routes
      .filter((r) => /\/ru\/blog\/.+/.test(r.url))
      .filter((r) => !RU_TRANSLATED.some((slug) => r.url.endsWith(`/blog/${slug}`)));
    expect(unexpected.map((r) => r.url), 'untranslated ru blog articles must stay out').toEqual([]);
  });

  it('keeps ru hreflang only on ru-translated blog articles', () => {
    const ruSlug = routes.find((r) => r.url === `${BASE_URL}/en/blog/free-word-games-online`);
    expect((ruSlug?.alternates?.languages as Record<string, string>)?.ru).toBe(
      `${BASE_URL}/ru/blog/free-word-games-online`
    );
    const nonRuSlug = routes.find((r) => r.url === `${BASE_URL}/en/blog/boggle-vs-wordle`);
    expect((nonRuSlug?.alternates?.languages as Record<string, string>)?.ru).toBeUndefined();
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
