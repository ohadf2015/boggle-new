/**
 * Default share image for pages that set their own `openGraph` / `twitter`
 * metadata. Next.js merges metadata shallowly: a page-level `openGraph: {...}`
 * without `images` REPLACES the root layout's openGraph and ships no og:image at
 * all (guides, rules, glossary, tools, words, anagram, daily archive, custom had
 * no link-preview image on prod until 2026-10-07). Spread these in instead.
 */
const SITE = 'https://www.lexiclash.live';

/** Locale-specific 1200x630 share cards that exist in public/. */
export const OG_IMAGE_BY_LOCALE: Record<string, string> = {
  en: 'og-image-en.webp',
  he: 'og-image-he.webp',
  sv: 'og-image-sv.webp',
  ja: 'og-image-ja.webp',
  es: 'og-image-es.webp',
};

export function defaultOgImageUrl(locale?: string): string {
  return `${SITE}/${OG_IMAGE_BY_LOCALE[locale ?? 'en'] ?? OG_IMAGE_BY_LOCALE.en}`;
}

export function defaultOgImages(locale?: string, alt = 'LexiClash - Multiplayer Word Game') {
  return [{ url: defaultOgImageUrl(locale), width: 1200, height: 630, alt }];
}
