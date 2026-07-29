/**
 * Dictionary backing for Blast level validation.
 *
 * Backend Dictionary API (from backend/dictionary.ts):
 * - `import { dictionary } from 'backend/dictionary'` — singleton instance
 * - `await dictionary.ensureLanguageLoaded(language)` — async per-language loader
 * - `dictionary.isValidWord(word: string, language: Language): boolean | null`
 *   Returns true if valid, false if invalid, null if language not loaded.
 *   Handles all normalization internally: Hebrew via normalizeHebrewWord,
 *   Spanish via normalizeSpanishWord, English/Swedish via .toLowerCase(), Japanese as-is.
 * - Language type: 'en' | 'he' | 'sv' | 'ja' | 'es' (matches Blast Locale exactly)
 *
 * This adapter wraps the dictionary to provide a simple async (word) => boolean
 * predicate, caching per locale, and treating null (language not loaded) as false.
 */

import { dictionary } from '@/backend/dictionary';
import type { Locale } from '../types';

/** Cache of predicates per locale */
const predicateCache = new Map<Locale, (word: string) => boolean>();

/**
 * Get or create a memoized predicate for a locale.
 * Ensures the language is loaded, then returns a sync function that validates words.
 * Caches the predicate to avoid repeated loads.
 */
export async function getBlastDictionary(
  locale: Locale,
): Promise<(word: string) => boolean> {
  // Return cached predicate if available
  if (predicateCache.has(locale)) {
    return predicateCache.get(locale)!;
  }

  // Ensure the language is loaded
  await dictionary.ensureLanguageLoaded(locale);

  // Create and cache a sync predicate
  let warnedNull = false;
  const predicate = (word: string): boolean => {
    const result = dictionary.isValidWord(word, locale);
    if (result === null) {
      // Language failed to load; log warning once per locale
      if (!warnedNull) {
        console.warn(
          `[BlastDictionary] Language ${locale} dictionary is not loaded; treating as invalid. Fix: call dictionary.ensureLanguageLoaded('${locale}') at startup.`,
        );
        warnedNull = true;
      }
      return false;
    }
    return result;
  };

  predicateCache.set(locale, predicate);
  return predicate;
}

/**
 * Clear all cached predicates (for testing or resets).
 */
export function clearBlastDictionaryCache(): void {
  predicateCache.clear();
}
