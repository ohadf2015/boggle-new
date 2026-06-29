/**
 * Word Normalization Utilities
 * Single source of truth for all language-specific word normalization
 *
 * This module consolidates duplicated normalization logic from:
 * - fe-next/utils/utils.ts
 * - fe-next/utils/clientWordValidator.ts
 * - fe-next/backend/modules/wordValidator.js
 */

import type { Language } from '@/shared/types/game';

// ============================================================
// HEBREW NORMALIZATION
// ============================================================

/**
 * Hebrew final-letter mappings — sofit form to regular form.
 * Use when storing letters in any data structure that should be position-agnostic
 * (boards, tile pools, dictionaries, validation sets).
 */
export const HEBREW_FINAL_TO_REGULAR: Record<string, string> = {
  'ץ': 'צ',
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ'
};

/**
 * Hebrew regular-to-sofit mapping. Apply ONLY at the display/render boundary —
 * never on board state, never on stored words, never on dictionary keys.
 */
export const HEBREW_REGULAR_TO_FINAL: Record<string, string> = {
  'צ': 'ץ',
  'כ': 'ך',
  'מ': 'ם',
  'נ': 'ן',
  'פ': 'ף'
};

/**
 * Canonical Hebrew base alphabet (22 letters, regular forms only).
 * This is the ONLY letter set that should ever appear on a playable board grid
 * or tile pool. Sofit letters are display-only.
 */
export const HEBREW_BASE_LETTERS: readonly string[] = [
  'א','ב','ג','ד','ה','ו','ז','ח','ט','י',
  'כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת',
];

/**
 * Valid Hebrew letters (aleph to tav, including final forms)
 */
const VALID_HEBREW_LETTERS = new Set([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ',
  'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת'
]);

/**
 * Normalize a single Hebrew letter - convert final forms to regular forms
 */
export function normalizeHebrewLetter(letter: string): string {
  return HEBREW_FINAL_TO_REGULAR[letter] || letter;
}

/**
 * Normalize an entire Hebrew word - convert all final forms to regular
 */
export function normalizeHebrewWord(word: string): string {
  if (typeof word !== 'string') return '';
  return word.split('').map(normalizeHebrewLetter).join('');
}

/**
 * Check if a character is a valid Hebrew letter
 */
export function isValidHebrewLetter(char: string): boolean {
  return VALID_HEBREW_LETTERS.has(char);
}

/**
 * Filter a Hebrew word to only include valid letters (removes punctuation)
 */
export function filterHebrewWord(word: string): string {
  return word.split('').filter(isValidHebrewLetter).join('');
}

/**
 * Convert regular Hebrew letters to final forms when at end of word
 */
export function applyHebrewFinalLetters(word: string): string {
  if (typeof word !== 'string' || word.length === 0) return word;

  const chars = word.split('');
  const lastChar = chars[chars.length - 1];
  if (lastChar && HEBREW_REGULAR_TO_FINAL[lastChar]) {
    chars[chars.length - 1] = HEBREW_REGULAR_TO_FINAL[lastChar];
  }

  return chars.join('');
}

// ============================================================
// SPANISH NORMALIZATION
// ============================================================

/**
 * Spanish accent mappings - accented vowels to base vowels
 * Note: Ñ is kept as-is since it's a distinct letter in Spanish
 */
const SPANISH_ACCENT_MAP: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

/**
 * Normalize a single Spanish letter - remove accents
 */
export function normalizeSpanishLetter(letter: string): string {
  const lower = letter.toLowerCase();
  return SPANISH_ACCENT_MAP[lower] || lower;
}

/**
 * Normalize an entire Spanish word - remove accents from vowels
 */
export function normalizeSpanishWord(word: string): string {
  if (typeof word !== 'string') return '';
  return word.split('').map(normalizeSpanishLetter).join('');
}

// ============================================================
// RUSSIAN NORMALIZATION
// ============================================================

/**
 * Russian ё/е folding. `ё` and `е` are routinely interchanged in everyday
 * Russian typing, and dictionaries are inconsistent about which form they store.
 * Fold ё→е on BOTH the dictionary (load time) and the guess (validate time) so
 * a board `Е` tile and a dictionary `ёж`/`еж` always match. The board never
 * shows a `Ё` tile (see russianLetterPool), so this is purely a guess-side and
 * dictionary-side reconciliation. Mirrors the Spanish accent-fold approach.
 */
export function normalizeRussianLetter(letter: string): string {
  const lower = letter.toLowerCase();
  return lower === 'ё' ? 'е' : lower;
}

/**
 * Normalize an entire Russian word - lowercase and fold ё→е.
 */
export function normalizeRussianWord(word: string): string {
  if (typeof word !== 'string') return '';
  return word.toLowerCase().replace(/ё/g, 'е');
}

// ============================================================
// GENERIC NORMALIZATION (Language-agnostic)
// ============================================================

/**
 * Normalize a single letter for a given language
 */
export function normalizeLetter(letter: string, language: Language): string {
  const lower = letter.toLowerCase();
  switch (language) {
    case 'he':
      return normalizeHebrewLetter(lower);
    case 'es':
      return normalizeSpanishLetter(lower);
    case 'ru':
      return normalizeRussianLetter(lower);
    default:
      return lower;
  }
}

/**
 * Normalize a word for a given language
 * This is the primary function to use for cross-language normalization
 */
export function normalizeWord(word: string, language: Language): string {
  // Guard against null/undefined board cells reaching here during rAF ticks.
  // Without this, es threw "null.split" (Sentry 1ME) and en/sv threw
  // "null.toLowerCase is not a function" (Sentry 1MA). One guard covers all branches.
  if (typeof word !== 'string') return '';
  switch (language) {
    case 'he':
      return normalizeHebrewWord(word);
    case 'es':
      return normalizeSpanishWord(word);
    case 'ru':
      return normalizeRussianWord(word);
    case 'ja':
      return word; // Japanese doesn't need normalization
    case 'en':
    case 'sv':
    default:
      return word.toLowerCase();
  }
}

// ============================================================
// WORD SANITIZATION (Removes invisible Unicode characters)
// ============================================================

/**
 * Regex pattern for invisible Unicode characters that should be removed
 * Includes:
 * - Zero-width characters (ZWSP, ZWNJ, ZWJ, WJ)
 * - Directional formatting marks (LRM, RLM, LRE, RLE, PDF, etc.)
 * - Soft hyphen
 * - Non-breaking spaces (converted to regular spaces then trimmed)
 * - Hebrew vowel points (niqqud) and cantillation marks
 */
const INVISIBLE_UNICODE_PATTERN = /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD\u00A0\u0591-\u05C7]/g;

/**
 * Sanitize a word by removing invisible Unicode characters
 * This fixes issues where words from database or user input contain hidden characters
 * that cause length mismatches in feedback generation
 *
 * @param word - The word to sanitize
 * @param language - Optional language for additional filtering
 * @returns Sanitized word with only visible characters
 *
 * @example
 * // Remove RTL mark from Hebrew word
 * sanitizeWord('שמים\u200F') // Returns: 'שמים'
 *
 * // Remove niqqud (vowel points) from Hebrew
 * sanitizeWord('שָׁמַיִם') // Returns: 'שמים'
 *
 * // Trim whitespace
 * sanitizeWord('  hello  ') // Returns: 'hello'
 */
export function sanitizeWord(word: string, language?: Language): string {
  if (typeof word !== 'string') return '';

  // Step 1: Remove invisible Unicode characters
  let sanitized = word.replace(INVISIBLE_UNICODE_PATTERN, '');

  // Step 2: Trim whitespace
  sanitized = sanitized.trim();

  // Step 3: If language specified, filter to valid characters only
  if (language === 'he') {
    sanitized = filterHebrewWord(sanitized);
  }

  return sanitized;
}

// ============================================================
// VALIDATION PATTERNS
// ============================================================

/**
 * Language-specific regex patterns for valid characters
 */
const LANGUAGE_PATTERNS: Record<Language, RegExp> = {
  he: /^[\u0590-\u05FF]+$/,
  en: /^[a-zA-Z]+$/,
  sv: /^[a-zA-ZåäöÅÄÖ]+$/,
  es: /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+$/,
  ru: /^[\u0400-\u04FF]+$/,
  ja: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
  // Add more languages as needed
  fr: /^[a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]+$/,
  de: /^[a-zA-ZäöüßÄÖÜ]+$/,
};

/**
 * Get the regex pattern for valid characters in a language
 */
export function getLanguageRegex(language: Language): RegExp {
  return LANGUAGE_PATTERNS[language] || LANGUAGE_PATTERNS.en;
}

/**
 * Check if a word contains only valid characters for the given language
 */
export function isValidWordCharacters(word: string, language: Language): boolean {
  return getLanguageRegex(language).test(word);
}

/**
 * Get set of valid characters for a language (useful for filtering)
 */
export function getValidCharacterSet(language: Language): Set<string> {
  switch (language) {
    case 'he':
      return VALID_HEBREW_LETTERS;
    default:
      // For other languages, return empty set (use regex instead)
      return new Set();
  }
}
