const BASE_URL = 'https://www.lexiclash.live';

/**
 * Canonical + hreflang block for pages indexed ONLY in English.
 *
 * Some routes (anagram solver, programmatic word lists) render English-only
 * content and set `robots: { index: locale === 'en' }` — their he/sv/ja/es
 * variants are noindexed and have no localized equivalent to point at.
 *
 * For such a page the hreflang cluster must self-reference EN only. Declaring
 * the noindexed /he|/sv|/ja|/es siblings as alternates produces an invalid
 * cluster ("alternate page with noindex" in GSC) and pairs badly with the
 * sitemap, which is likewise emitted EN-only for these routes (see sitemap.ts
 * `addForLocaleOnly`). Non-EN variants canonicalize to /en here regardless of
 * the requesting locale, so they consolidate cleanly onto the indexable URL.
 *
 * @param path absolute path after the locale segment, e.g. `/anagram/aelrst`
 */
export function enOnlyAlternates(path: string): {
  canonical: string;
  languages: Record<string, string>;
} {
  const enUrl = `${BASE_URL}/en${path}`;
  return {
    canonical: enUrl,
    languages: {
      'x-default': enUrl,
      en: enUrl,
    },
  };
}
