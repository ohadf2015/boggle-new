/**
 * Pages whose body exists only in English. Every locale route renders that
 * same English text, so search engines read /sv/legal/terms etc. as near
 * copies of the /en page. Their non-English copies are noindex,follow, point
 * hreflang and canonical at /en, and stay out of the sitemap.
 *
 * Translating one of these pages? Remove it from this list.
 */
export const ENGLISH_ONLY_BODY_PATHS = [
  '/about',
  '/legal/terms',
  '/legal/disclaimer',
  '/legal/cookies',
  '/legal/refund',
] as const;
