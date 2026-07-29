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
