/**
 * Single source of truth for mapping a browser/HTTP language preference to one
 * of the locales we ship native, hand-crafted translations for.
 *
 * Why this exists: four call sites used to each re-derive locale negotiation
 * (`proxy.ts`, `server/localeRedirect.ts`, `contexts/LanguageContext.tsx`,
 * `utils/languageSuggestion.ts`) — with *different* logic. One only looked at
 * the first `Accept-Language` tag; another q-sorted the whole list; none of
 * them handled languages we don't ship but that are close to one we do.
 *
 * The reported bug: a Brazilian player (browser `Accept-Language:
 * pt-BR,pt;q=0.9,en;q=0.8`) was served English. Portuguese isn't one of our
 * five bundles, so the resolver skipped `pt` and matched the lower-priority
 * `en;q=0.8` — even though our Spanish bundle is far more intelligible to a
 * Portuguese speaker than English. The fix is a *proximity* step that is
 * evaluated per-tag, interleaved with the exact-match check, in q-descending
 * order — so `pt` (q=1) maps to `es` BEFORE `en` (q=0.8) is ever considered.
 *
 * Pure module (no `navigator`/`document`/headers/storage) so it runs unchanged
 * on the Express server, the Next proxy, and the client, and is unit-testable.
 */
import { locales, defaultLocale } from './i18n';

/** Locales we ship native translations for. Re-exported from the routing source. */
export const SUPPORTED_LOCALES: readonly string[] = locales;
export const DEFAULT_LOCALE: string = defaultLocale;

const SUPPORTED = new Set<string>(SUPPORTED_LOCALES);

/**
 * Languages we do NOT ship, mapped to the closest locale we DO ship. A speaker
 * of the key language understands the value language's bundle far better than
 * our English default. Keep every value inside SUPPORTED_LOCALES (asserted by a
 * test). Scope is deliberately the Romance cluster that maps to Spanish — the
 * reported case (Brazil) plus its obvious neighbours.
 */
export const LOCALE_PROXIMITY: Record<string, string> = {
  pt: 'es', // Portuguese (incl. Brazil / pt-BR) -> Spanish
  gl: 'es', // Galician -> Spanish
  ca: 'es', // Catalan -> Spanish
  it: 'es', // Italian -> Spanish
};

/** Legacy / deprecated ISO codes some browsers still emit, mapped to current. */
const LEGACY_ALIASES: Record<string, string> = {
  iw: 'he', // deprecated ISO code for Hebrew
};

/**
 * Reduce a BCP-47 tag (`es-MX`, `EN-gb`, `ja_JP`, legacy `iw`) to its
 * normalised primary subtag, or `null` for empty/invalid input.
 */
export function normalizePrimarySubtag(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const primary = tag.toLowerCase().split(/[-_]/)[0];
  if (!primary) return null;
  return LEGACY_ALIASES[primary] ?? primary;
}

/**
 * Map a single language tag to a supported locale — exact match first, then
 * linguistic proximity — or `null` if we ship nothing close.
 */
export function mapToSupportedLocale(tag: string | null | undefined): string | null {
  const primary = normalizePrimarySubtag(tag);
  if (!primary) return null;
  if (SUPPORTED.has(primary)) return primary;
  return LOCALE_PROXIMITY[primary] ?? null;
}

interface WeightedTag {
  tag: string;
  q: number;
}

/** Parse an `Accept-Language` header into tags sorted by descending quality. */
function parseAcceptLanguage(header: string): WeightedTag[] {
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const parsed = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(parsed) ? parsed : 0 };
    })
    .filter((t) => t.tag.length > 0)
    // V8's Array.sort is stable, so equal-q tags keep their header order.
    .sort((a, b) => b.q - a.q);
}

/**
 * Resolve an `Accept-Language` header to a supported locale, or `null` when no
 * tag maps to anything (exactly or by proximity). Each tag is checked in
 * q-descending order; the FIRST tag that maps wins — exact OR proximity — so a
 * high-priority unsupported-but-close language beats a low-priority exact one.
 */
export function matchAcceptLanguage(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const { tag } of parseAcceptLanguage(header)) {
    const match = mapToSupportedLocale(tag);
    if (match) return match;
  }
  return null;
}

/**
 * Like {@link matchAcceptLanguage} but falls back to a default locale (our
 * English bundle) when nothing maps. Use on paths that must yield a concrete
 * locale (server redirect, client mount); use {@link matchAcceptLanguage}
 * where `null` means "let a later stage decide".
 */
export function resolveLocaleFromAcceptLanguage(
  header: string | null | undefined,
  fallback: string = DEFAULT_LOCALE,
): string {
  return matchAcceptLanguage(header) ?? fallback;
}

/**
 * First supported locale across an ordered list of language tags
 * (e.g. `navigator.languages`), exact-or-proximity, or `null` if none map.
 */
export function matchLanguageList(
  tags: readonly string[] | null | undefined,
): string | null {
  if (!tags) return null;
  for (const tag of tags) {
    const match = mapToSupportedLocale(tag);
    if (match) return match;
  }
  return null;
}

/**
 * Weak country → locale map. Used only after an explicit choice and
 * Accept-Language have both failed to produce a supported locale. Country is a
 * poor proxy for language (an English speaker in Israel, a Spanish speaker in
 * the US), so this must never outrank the browser language or a saved cookie.
 */
export const COUNTRY_TO_LOCALE: Record<string, string> = {
  IL: 'he', US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en',
  IE: 'en', ZA: 'en', IN: 'en', PH: 'en', SG: 'en',
  SE: 'sv', FI: 'sv', JP: 'ja',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es',
  HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es',
  UY: 'es', PR: 'es', GQ: 'es',
};

/** Cookie names that store an explicit or previously negotiated UI locale. */
export const LOCALE_COOKIE_NAMES = ['boggle_language', 'NEXT_LOCALE'] as const;

const COUNTRY_HEADER_NAMES = [
  'x-country-code',
  'cf-ipcountry',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
] as const;

/** Cloudflare uses XX for unknown and T1 for Tor — not real countries. */
const IGNORED_COUNTRY_CODES = new Set(['', 'XX', 'T1', 'ZZ']);

export function localeFromCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  if (IGNORED_COUNTRY_CODES.has(code)) return null;
  const mapped = COUNTRY_TO_LOCALE[code];
  return mapped && SUPPORTED.has(mapped) ? mapped : null;
}

export function countryFromHeaders(
  getHeader: (name: string) => string | null | undefined,
): string | null {
  for (const name of COUNTRY_HEADER_NAMES) {
    const value = getHeader(name);
    if (!value) continue;
    const code = value.trim().toUpperCase();
    if (!IGNORED_COUNTRY_CODES.has(code)) return code;
  }
  return null;
}

export function localeFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // keep the raw value
    }
    if (name && !map.has(name)) map.set(name, value);
  }
  for (const name of LOCALE_COOKIE_NAMES) {
    const value = map.get(name);
    if (value && SUPPORTED.has(value)) return value;
  }
  return null;
}

export interface RequestLocaleInput {
  queryLocale?: string | null;
  cookieHeader?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
}

/**
 * Best-practice UI locale negotiation for an unprefixed request.
 *
 * Precedence (first match wins):
 *  1. Explicit `?locale=` query (docs / RTL / automation)
 *  2. Saved choice: `boggle_language` cookie, then `NEXT_LOCALE`
 *  3. `Accept-Language` with q-values, region stripping, and proximity
 *  4. Geo country, as a weak last hint only
 *  5. Default locale (English)
 *
 * A locale-prefixed URL is handled by the caller and is never overridden here.
 */
export function resolveRequestLocale(
  input: RequestLocaleInput,
  fallback: string = DEFAULT_LOCALE,
): string {
  const query = input.queryLocale?.trim().toLowerCase() ?? '';
  if (query && SUPPORTED.has(query)) return query;
  return (
    localeFromCookieHeader(input.cookieHeader)
    ?? matchAcceptLanguage(input.acceptLanguage)
    ?? localeFromCountry(input.country)
    ?? fallback
  );
}

/** Merge a Vary token without duplicating existing values. */
export function mergeVary(existing: string | string[] | null | undefined, extra: string): string {
  const current = Array.isArray(existing) ? existing.join(',') : (existing ?? '');
  const tokens = new Set(
    current
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase()),
  );
  for (const token of extra.split(',').map((t) => t.trim()).filter(Boolean)) {
    if (!tokens.has(token.toLowerCase())) {
      tokens.add(token.toLowerCase());
    }
  }
  // Preserve canonical casing for the tokens we care about.
  const canon: Record<string, string> = {
    'accept-language': 'Accept-Language',
    cookie: 'Cookie',
    'accept-encoding': 'Accept-Encoding',
  };
  return [...tokens].map((t) => canon[t] ?? t).join(', ');
}
