import type { Language } from '@/types';
import { normalizeHebrewLetter } from '@/shared/utils/wordNormalization';

/**
 * Unique letters of a source word, upper-cased, in order. Hebrew final forms
 * fold to regular letters so tiles show one form per letter.
 */
export function getUniqueLetters(word: string, language?: Language): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const char of word) {
    const upper = char.toUpperCase();
    if (upper === ' ') continue;
    const normalized = language === 'he' ? normalizeHebrewLetter(upper) : upper;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

/** Fisher-Yates shuffle in place with the given PRNG. */
export function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
