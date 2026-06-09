import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';

describe('sitemap', () => {
  // Regression: previously used generateSitemaps() which made Next.js serve
  // chunks at /sitemap/[id].xml but NOT an index at /sitemap.xml. The
  // [locale] catch-all then matched "sitemap.xml" as a locale value and
  // returned HTML, triggering Google's "Sitemap appears to be HTML page".
  it('exports a parameterless default function (single-sitemap mode)', () => {
    expect(typeof sitemap).toBe('function');
    expect(sitemap.length).toBe(0);
  });

  it('returns a non-empty array of sitemap entries', () => {
    const entries = sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(100);
  });

  it('every entry is an absolute https URL on the production domain', () => {
    for (const entry of sitemap()) {
      expect(entry.url).toMatch(/^https:\/\/www\.lexiclash\.live\//);
    }
  });

  it('covers all five locales as path prefixes', () => {
    const urls = sitemap().map((e) => e.url);
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(urls.some((u) => u.includes(`/${locale}/`) || u.endsWith(`/${locale}`))).toBe(true);
    }
  });

  it('stays under Google sitemap caps (50k URLs, 50MB)', () => {
    const entries = sitemap();
    expect(entries.length).toBeLessThan(50_000);
    // Rough size estimate: each entry ~2KB with hreflangs. 410 × 2KB ≈ 820KB.
    expect(entries.length * 2048).toBeLessThan(50 * 1024 * 1024);
  });

  it('includes education sub-routes (duels + classroom-game) for all locales', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(urls.has(`https://www.lexiclash.live/${locale}/education/duels`), `sitemap missing /${locale}/education/duels`).toBe(true);
      expect(urls.has(`https://www.lexiclash.live/${locale}/education/classroom-game`), `sitemap missing /${locale}/education/classroom-game`).toBe(true);
    }
  });

  it('includes English commercial-intent doorway pages (WWF / multiplayer / free-online targets)', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    const required = [
      'https://www.lexiclash.live/en/words-with-friends-alternative',
      'https://www.lexiclash.live/en/online-word-games-with-friends',
      'https://www.lexiclash.live/en/free-multiplayer-word-game',
      'https://www.lexiclash.live/en/play-boggle-online-free',
      'https://www.lexiclash.live/en/word-games-online-free',
    ];
    for (const url of required) {
      expect(urls.has(url), `sitemap missing: ${url}`).toBe(true);
    }
  });

  // AdSense low-value-content remediation (2026-06-04): per-date archive pages
  // are thin per-puzzle stat snapshots. They are now noindex,follow at the page
  // level (app/[locale]/daily/archive/[date]/page.tsx) and are NO LONGER listed
  // in the sitemap — ~780 URLs across 5 locales were dragging the domain's
  // content-quality average below AdSense's bar. They stay fully playable; we
  // just don't advertise them. See docs/2026-06-04-adsense-approval-plan.md.
  it('does NOT include per-date daily archive URLs (thin, now noindex)', () => {
    const archiveDateUrls = sitemap()
      .map((e) => e.url)
      .filter((u) => /\/daily\/archive\/\d{4}-\d{2}-\d{2}$/.test(u));
    expect(
      archiveDateUrls.length,
      `expected 0 per-date archive URLs, found ${archiveDateUrls.length}`,
    ).toBe(0);
  });

  it('still lists the /daily/archive hub (canonical archive entry point)', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(
        urls.has(`https://www.lexiclash.live/${locale}/daily/archive`),
        `sitemap missing archive hub for /${locale}`,
      ).toBe(true);
    }
  });

  it('does NOT include today or future archive dates (only finalized past puzzles)', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(urls.has(`https://www.lexiclash.live/${locale}/daily/archive/${today}`)).toBe(false);
      expect(urls.has(`https://www.lexiclash.live/${locale}/daily/archive/${tomorrowStr}`)).toBe(false);
    }
  });

  // ─── EN-only-indexed pages must be advertised EN-only ───
  // These route groups set robots: { index: locale === 'en' } in their page
  // metadata (English-only body / thin programmatic content). Emitting their
  // he/sv/ja/es variants in the sitemap made Google crawl them only to obey a
  // noindex tag — the "Excluded by noindex tag" coverage spike (GSC 2026-05-20,
  // ~900 anagram + words + comparison URLs). Sitemap must match the noindex.

  it('omits anagram solver seed pages in every locale (retired from sitemap 2026-06-08)', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    // Programmatic /anagram/[letters] routes are robots:{index:false} and were
    // pulled from the sitemap entirely — emitting them only invited crawl of
    // noindexed URLs (the "Excluded by noindex tag" GSC spike). 'belt' is a seed
    // (sorted form 'belt'); none of its locale variants — including EN — may appear.
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(
        urls.has(`https://www.lexiclash.live/${locale}/anagram/belt`),
        `sitemap should NOT advertise retired /${locale}/anagram/belt`,
      ).toBe(false);
    }
  });

  it('lists the anagram hub for EN only', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    expect(urls.has('https://www.lexiclash.live/en/anagram')).toBe(true);
    for (const locale of ['he', 'sv', 'ja', 'es']) {
      expect(urls.has(`https://www.lexiclash.live/${locale}/anagram`)).toBe(false);
    }
  });

  it('lists programmatic /words pages (N-letter + starting-with) for EN only', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    expect(urls.has('https://www.lexiclash.live/en/words/3-letter-words')).toBe(true);
    expect(urls.has('https://www.lexiclash.live/en/words/starting-with/a')).toBe(true);
    for (const locale of ['he', 'sv', 'ja', 'es']) {
      expect(urls.has(`https://www.lexiclash.live/${locale}/words/3-letter-words`)).toBe(false);
      expect(urls.has(`https://www.lexiclash.live/${locale}/words/starting-with/a`)).toBe(false);
    }
  });

  it('lists generic comparison pages for EN only (English-only body)', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    for (const slug of ['lexiclash-vs-wordle', 'lexiclash-vs-quizlet', 'lexiclash-vs-scrabble']) {
      expect(urls.has(`https://www.lexiclash.live/en/${slug}`), `missing /en/${slug}`).toBe(true);
      for (const locale of ['he', 'sv', 'ja', 'es']) {
        expect(urls.has(`https://www.lexiclash.live/${locale}/${slug}`)).toBe(false);
      }
    }
  });

  it('keeps locale-specific comparison pages on their target locale', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    // These have a native localized body and are index:true only on their locale.
    expect(urls.has('https://www.lexiclash.live/sv/lexiclash-vs-wordfeud')).toBe(true);
    expect(urls.has('https://www.lexiclash.live/es/lexiclash-vs-apalabrados')).toBe(true);
  });

  // Regression guard: genuinely-localized routes must STILL appear in all five
  // locales. Catches an over-eager refactor that narrows a localized route.
  it('still lists genuinely-localized routes for all five locales', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    const localizedPaths = ['/multiplayer', '/daily', '/blog', '/blog/word-game-history', '/how-to-play'];
    for (const path of localizedPaths) {
      for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
        expect(
          urls.has(`https://www.lexiclash.live/${locale}${path}`),
          `sitemap dropped localized ${locale}${path}`,
        ).toBe(true);
      }
    }
  });
});
