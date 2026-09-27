/**
 * The only place page copy may learn a dictionary size.
 *
 * Counts come from `dictionaryStats.generated.json`, written by
 * `scripts/measure-dictionaries.ts`, which rebuilds each validation Set exactly as
 * `backend/dictionaryLoaders.ts` does. Nothing here is typed by hand — the first
 * version of this copy was, and it shipped "over 1,400,000" Russian words (a source
 * line count; the real Set is 1,347,105) while understating English by 145,000.
 *
 * Everything published is a FLOOR, never the exact total. Two reasons:
 *   - a Set grows every time a community word is approved, so an exact number is
 *     stale the next day while a floor stays true;
 *   - the counts are not comparable across languages by construction (English comes
 *     from an npm array, Hebrew from a normalised file, Japanese from hiragana only),
 *     so a precise figure implies a precision that is not there.
 *
 * `app/[locale]/education/__tests__/dictionaryFigures.test.ts` asserts that every
 * dictionary number rendered on an education page is one of these floors.
 */
import stats from './dictionaryStats.generated.json';

export type DictionaryLang = keyof typeof stats.counts;

export const DICTIONARY_COUNTS: Readonly<Record<DictionaryLang, number>> = stats.counts;
export const DICTIONARY_STATS_GENERATED_AT: string = stats.generatedAt;
export const DICTIONARY_STATS_METHOD: string = stats.method;

/**
 * Japanese prose counts in 万 (10,000), so its floor is a multiple of 10,000 or the
 * rendering is unnatural. Every other language floors to the nearest 1,000. Both are
 * true floors; they just round at the granularity their own language reads well in.
 */
function floorFor(lang: DictionaryLang, locale: string): number {
  const step = locale === 'ja' ? 10_000 : 1_000;
  return Math.floor(DICTIONARY_COUNTS[lang] / step) * step;
}

/**
 * The published floor for `lang`, formatted for a reader of `locale`.
 * `en` → "415,000" · `ru` → "415 000" · `ja` → "41万".
 */
export function dictionaryFloor(lang: DictionaryLang, locale: string): string {
  const n = floorFor(lang, locale);
  if (locale === 'ja') return `${n / 10_000}万`;
  if (locale === 'ru') return n.toLocaleString('ru-RU').replace(/ /g, ' ');
  return n.toLocaleString('en-US');
}

/** Every floor a page may legitimately print, in every locale. Used by the guard test. */
export function allDictionaryFloors(locale: string): string[] {
  return (Object.keys(DICTIONARY_COUNTS) as DictionaryLang[]).map((l) => dictionaryFloor(l, locale));
}
