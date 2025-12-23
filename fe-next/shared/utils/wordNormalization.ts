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
 * Hebrew final letter mappings - convert final forms to regular forms
 */
const HEBREW_FINAL_TO_REGULAR: Record<string, string> = {
  'ץ': 'צ',
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ'
};

/**
 * Hebrew regular to final letter mappings
 */
const HEBREW_REGULAR_TO_FINAL: Record<string, string> = {
  'צ': 'ץ',
  'כ': 'ך',
  'מ': 'ם',
  'נ': 'ן',
  'פ': 'ף'
};

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
  return word.split('').map(normalizeSpanishLetter).join('');
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
    default:
      return lower;
  }
}

/**
 * Normalize a word for a given language
 * This is the primary function to use for cross-language normalization
 */
export function normalizeWord(word: string, language: Language): string {
  switch (language) {
    case 'he':
      return normalizeHebrewWord(word);
    case 'es':
      return normalizeSpanishWord(word);
    case 'ja':
      return word; // Japanese doesn't need normalization
    case 'en':
    case 'sv':
    default:
      return word.toLowerCase();
  }
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
