import type { Language } from '@/shared/types/game';

const SUPPORTED: ReadonlySet<Language> = new Set(['en', 'he', 'sv', 'ja', 'es']);

/** Country → preferred app language. Defaults to English when unmapped. */
const COUNTRY_TO_LANG: Readonly<Record<string, Language>> = {
  IL: 'he',
  SE: 'sv',
  JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CL: 'es', CO: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es',
};

const browserLanguageToSupported = (raw: string | undefined): Language | null => {
  if (!raw) return null;
  const tag = raw.toLowerCase();
  const primary = tag.split(/[-_]/)[0];
  if (primary === 'iw' || primary === 'he') return 'he';
  if (primary === 'sv') return 'sv';
  if (primary === 'ja') return 'ja';
  if (primary === 'es') return 'es';
  if (primary === 'en') return 'en';
  return null;
};

/**
 * Pick a supported app language from CrazyGames signals.
 *
 * Priority (highest first):
 *  1. CG SDK `countryCode` mapped to a regional language (IL→he, JP→ja, …)
 *  2. `navigator.language` primary subtag
 *  3. `navigator.languages[]` first supported entry
 *  4. `null` (caller falls back to current/URL locale)
 */
export const detectCrazyGamesLanguage = (
  countryCode: string | null | undefined,
): Language | null => {
  if (countryCode) {
    const mapped = COUNTRY_TO_LANG[countryCode.toUpperCase()];
    if (mapped && SUPPORTED.has(mapped)) return mapped;
  }
  if (typeof navigator === 'undefined') return null;
  const fromPrimary = browserLanguageToSupported(navigator.language);
  if (fromPrimary) return fromPrimary;
  for (const tag of navigator.languages ?? []) {
    const lang = browserLanguageToSupported(tag);
    if (lang) return lang;
  }
  return null;
};
