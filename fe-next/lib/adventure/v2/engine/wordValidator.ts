import type { Locale, Tile } from '../types';
import { PROTO_DICT_EN } from './__protoDict';
import { PROTO_DICT_HE } from './__protoDictHe';

const MIN_WORD_LEN = 3;

const FINAL_TO_BASE_HE: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ',
};

function normalizeForLocale(word: string, locale: Locale): string {
  const trimmed = word.trim();
  if (locale === 'he') {
    return [...trimmed].map((c) => FINAL_TO_BASE_HE[c] ?? c).join('');
  }
  return trimmed.toUpperCase();
}

const DICT_BY_LOCALE: Record<Locale, ReadonlySet<string>> = {
  en: PROTO_DICT_EN,
  he: PROTO_DICT_HE,
};

export function isValidWord(word: string, locale: Locale = 'en'): boolean {
  const w = normalizeForLocale(word, locale);
  if (w.length < MIN_WORD_LEN) return false;
  return DICT_BY_LOCALE[locale].has(w);
}

export function isComposableFromTiles(word: string, tiles: Tile[]): boolean {
  const need = word.toUpperCase().split('');
  const have = tiles.map((t) => t.letter.toUpperCase());
  const haveCount = new Map<string, number>();
  have.forEach((l) => haveCount.set(l, (haveCount.get(l) ?? 0) + 1));
  for (const letter of need) {
    const c = haveCount.get(letter) ?? 0;
    if (c <= 0) return false;
    haveCount.set(letter, c - 1);
  }
  return true;
}

/**
 * Returns true if AT LEAST ONE valid word ≥3 letters can be composed
 * from the given tiles. Used to detect "stuck" slate states.
 */
export function hasAnyComposableWord(tiles: Tile[], locale: Locale = 'en'): boolean {
  if (tiles.length < 3) return false;
  const dict = DICT_BY_LOCALE[locale];
  for (const w of dict) {
    if (w.length > tiles.length) continue;
    if (isComposableFromTiles(w, tiles)) return true;
  }
  return false;
}
