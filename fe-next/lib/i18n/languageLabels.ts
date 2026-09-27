/**
 * One place that maps a language code to its display-label key and its flag.
 *
 * Every consumer that re-enumerated the locale list by hand has drifted —
 * EDUCATION_LANGUAGES carries the same warning from the round before this one.
 * The lobby was the next casualty: the host language chip built a five-entry
 * map inline behind an `as Record<Language, string>` cast, so a Russian room
 * asked for `t('joinView.undefined')` and rendered the raw key (Sentry
 * JAVASCRIPT-NEXTJS-1RH — 41 events, 2 users). The CrazyGames tutorial panel
 * had its own five-entry copies and simply never offered Russian at all.
 *
 * Room/board language is typed `Language` (8-wide — it adds fr/de) while the UI
 * ships 6 locales, so the lookups take a plain string and fall back. An
 * unmapped code can no longer compose a `.undefined` key.
 */
import { locales, type Locale } from '@/i18n/config';

export const LANGUAGE_LABEL_KEYS: Record<Locale, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
  ru: 'languages.russian',
};

export const LANGUAGE_FLAGS: Record<Locale, string> = {
  en: '\u{1F1FA}\u{1F1F8}',
  he: '\u{1F1EE}\u{1F1F1}',
  sv: '\u{1F1F8}\u{1F1EA}',
  ja: '\u{1F1EF}\u{1F1F5}',
  es: '\u{1F1EA}\u{1F1F8}',
  ru: '\u{1F1F7}\u{1F1FA}',
};

/** Flag shown for a language the UI has no locale for (fr/de rooms, bad data). */
const FALLBACK_FLAG = '\u{1F310}';

function isLocale(code: string): code is Locale {
  return (locales as readonly string[]).includes(code);
}

/** i18n key naming `code`'s language, falling back to English for unmapped codes. */
export function languageLabelKey(code: string): string {
  return isLocale(code) ? LANGUAGE_LABEL_KEYS[code] : LANGUAGE_LABEL_KEYS.en;
}

/** Flag emoji for `code`, or a globe for unmapped codes. */
export function languageFlag(code: string): string {
  return isLocale(code) ? LANGUAGE_FLAGS[code] : FALLBACK_FLAG;
}
