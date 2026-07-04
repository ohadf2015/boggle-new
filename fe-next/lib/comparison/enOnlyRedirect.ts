/**
 * Pure redirect gate for English-only comparison/SEO landing pages.
 * Non-English requests for these pages are redirected to their /en/ canonical
 * (matching the pages' existing robots/noindex + canonical design).
 */
export function englishComparisonRedirect(locale: string, slug: string): string | null {
  if (locale === 'en') return null;
  return `/en/${slug}`;
}
