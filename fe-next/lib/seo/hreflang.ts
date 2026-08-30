/**
 * The single hreflang map for a path.
 *
 * This used to live only in `app/sitemap.ts`, so a page's own
 * `<link rel="alternate">` set and the sitemap's `<xhtml:link>` set were written
 * independently — and they drifted. Google requires the two to agree: an
 * annotation the other side does not reciprocate is discarded, taking the rest
 * of the cluster with it. Both callers now build from here.
 *
 * Regional variants all point at an existing locale build; we do not ship a
 * separate en-GB or es-MX page, we just tell Google which of the six we have is
 * the right one for that market.
 */

export const HREFLANG_BASE_URL = 'https://www.lexiclash.live';

/** Locales that have a real build. Mirrors i18n/config.ts. */
export const HREFLANG_LOCALES = ['he', 'en', 'sv', 'ja', 'es', 'ru'] as const;

/** Regional code -> the locale build that serves it. */
const REGIONAL: Record<string, string> = {
  'en-IL': 'en',
  'he-IL': 'he',
  'en-US': 'en',
  'es-US': 'es',
  'en-GB': 'en',
  'en-SE': 'en',
  'sv-SE': 'sv',
  'en-JP': 'en',
  'ja-JP': 'ja',
  'en-ES': 'en',
  'es-ES': 'es',
  'en-MX': 'en',
  'es-MX': 'es',
  'en-AU': 'en',
  'es-AR': 'es',
  'es-CO': 'es',
  'ru-RU': 'ru',
};

export function hreflangAlternates(path: string): Record<string, string> {
  const alts: Record<string, string> = { 'x-default': `${HREFLANG_BASE_URL}/en${path}` };
  for (const l of HREFLANG_LOCALES) alts[l] = `${HREFLANG_BASE_URL}/${l}${path}`;
  for (const [code, locale] of Object.entries(REGIONAL)) {
    alts[code] = `${HREFLANG_BASE_URL}/${locale}${path}`;
  }
  return alts;
}
