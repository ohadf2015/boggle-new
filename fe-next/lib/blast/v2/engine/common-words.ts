import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Locale } from '../types';
import { LOCALE_CONFIGS } from '../locale-config';

const cache = new Map<Locale, (word: string) => boolean>();

/**
 * Returns a predicate that checks if a word is in the curated common-words list
 * for the given locale. Caches the predicate per locale.
 *
 * Membership check is case-insensitive and normalized per locale rules.
 */
export async function getBlastCommonWords(locale: Locale): Promise<(word: string) => boolean> {
  const cached = cache.get(locale);
  if (cached) return cached;

  const filename = locale === 'en' ? 'common_hunt_words.txt' : `common_hunt_words_${locale}.txt`;
  const filePath = resolve(process.cwd(), 'backend', filename);

  let words: Set<string>;
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    const config = LOCALE_CONFIGS[locale];
    // Normalize all words when storing in the Set for consistent lookup
    words = new Set(lines.map((w) => config.normalize(w)));
  } catch (err) {
    console.warn(`[getBlastCommonWords] Failed to load ${filename}: ${err instanceof Error ? err.message : String(err)}. Returning always-false predicate.`);
    const falsePredicate = () => false;
    cache.set(locale, falsePredicate);
    return falsePredicate;
  }

  const config = LOCALE_CONFIGS[locale];
  const predicate = (word: string): boolean => {
    const normalized = config.normalize(word);
    return words.has(normalized);
  };

  cache.set(locale, predicate);
  return predicate;
}

export function clearBlastCommonWordsCache(): void {
  cache.clear();
}
