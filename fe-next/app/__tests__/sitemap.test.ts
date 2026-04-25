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
      'https://www.lexiclash.live/en/multiplayer-word-game-online',
      'https://www.lexiclash.live/en/play-boggle-online-free',
      'https://www.lexiclash.live/en/word-games-online-free',
    ];
    for (const url of required) {
      expect(urls.has(url), `sitemap missing: ${url}`).toBe(true);
    }
  });
});
