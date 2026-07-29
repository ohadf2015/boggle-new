/**
 * Language detection utility for keyboard input
 *
 * Detects the language of a character based on Unicode ranges.
 * Used to notify users when they're typing with the wrong keyboard language.
 */

import type { Language } from '@/shared/types/game';

/**
 * Unicode ranges for language detection
 */
const LANGUAGE_RANGES = {
  // Hebrew: U+0590 to U+05FF
  hebrew: /[\u0590-\u05FF]/,

  // Japanese: Hiragana, Katakana, and common Kanji
  // Hiragana: U+3040 to U+309F
  // Katakana: U+30A0 to U+30FF
  // Kanji: U+4E00 to U+9FAF
  japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,

  // Swedish-specific characters (å, ä, ö)
  swedish: /[åäöÅÄÖ]/,

  // Spanish-specific characters (ñ, accented vowels)
  spanish: /[ñÑáéíóúÁÉÍÓÚüÜ]/,

  // English: Basic Latin alphabet (fallback for non-specific characters)
  english: /[a-zA-Z]/,
} as const;

/**
 * Detect the language of an input character
 *
 * @param char - The character to detect (typically from keyboard input)
 * @returns The detected language code, or null if not a letter
 *
 * @example
 * detectInputLanguage('א') // returns 'he'
 * detectInputLanguage('a') // returns 'en'
 * detectInputLanguage('å') // returns 'sv'
 * detectInputLanguage('あ') // returns 'ja'
 * detectInputLanguage('1') // returns null
 */
export function detectInputLanguage(char: string): Language | null {
  if (!char || char.length === 0) {
    return null;
  }

  // Check first character if multi-character string
  const firstChar = char[0];

  // Check in order of specificity (most specific first)
  if (LANGUAGE_RANGES.hebrew.test(firstChar)) {
    return 'he';
  }

  if (LANGUAGE_RANGES.japanese.test(firstChar)) {
    return 'ja';
  }

  if (LANGUAGE_RANGES.swedish.test(firstChar)) {
    return 'sv';
  }

  if (LANGUAGE_RANGES.spanish.test(firstChar)) {
    return 'es';
  }

  // English as fallback for basic Latin letters
  if (LANGUAGE_RANGES.english.test(firstChar)) {
    return 'en';
  }

  // Not a recognized letter
  return null;
}

/**
 * Get human-readable language name
 *
 * @param language - The language code
 * @returns The language name in English
 */
export function getLanguageName(language: Language | string): string {
  const names: Record<string, string> = {
    he: 'Hebrew',
    en: 'English',
    sv: 'Swedish',
    ja: 'Japanese',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
  };

  return names[language] || 'Unknown';
}

/**
 * Get language-specific keyboard instructions
 *
 * @param language - The target language
 * @returns Instructions for switching keyboard on different OS platforms
 */
export function getKeyboardSwitchInstructions(language: Language): string {
  const languageName = getLanguageName(language);

  // Generic cross-platform instruction
  return `Please switch to ${languageName} keyboard to match the board language`;
}
