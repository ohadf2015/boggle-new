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

/**
 * The bare root `/` is served at 200 (internal rewrite to a locale bundle —
 * server/localeRedirect.ts in prod, proxy.ts for Next-only runs) by deliberate
 * design: some server-side clients never follow redirects. A page that answers
 * 200 at its own URL must self-canonicalize, and Google's documented pattern
 * for a language-negotiating homepage is hreflang x-default pointing at the
 * negotiating URL itself. Before this, `/` served /en's tags (canonical /en,
 * x-default /en), so the hreflang cluster had no entry for the URL actually
 * served — flagged as "canonical points elsewhere" + "invalid hreflang".
 *
 * This request header is how the rewrite layer tells the [locale] layout the
 * page is being served at `/` (and which locale bundle it got). It is set ONLY
 * by the two rewrite entry points; the server strips any client-sent copy
 * first, so it cannot be spoofed into changing a locale page's canonical.
 */
export const ROOT_SERVED_HEADER = 'x-lc-root-served';

/** Canonical URL of the bare-root page. */
export const ROOT_CANONICAL = `${HREFLANG_BASE_URL}/`;

/**
 * The hreflang cluster of the root-served page: the per-locale entries are the
 * same as every locale homepage, but x-default names the negotiating root URL
 * itself, so the set contains an entry that points back at the page it sits on.
 */
export function rootServedAlternates(): Record<string, string> {
  return { ...hreflangAlternates(''), 'x-default': ROOT_CANONICAL };
}
