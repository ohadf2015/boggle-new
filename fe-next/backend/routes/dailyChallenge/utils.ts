/**
 * Daily Challenge Utilities
 * Helper functions for daily challenge routes
 */

import type { Language } from '../../../types';
import { normalizeHebrewWord } from '../../../shared/utils/wordNormalization';
import { isDictionaryWord } from '../../dictionary';
import { isWordCommunityValid } from '../../modules/communityWordManager';
import { VALID_LANGUAGES, ValidLanguage } from './types';

/**
 * Normalize a word for comparison based on language.
 * For Hebrew: converts final letters (ם,ך,ן,ף,ץ) to regular forms (מ,כ,נ,פ,צ)
 * For other languages: uses toUpperCase()
 */
export function normalizeWordForComparison(word: string, language: Language): string {
  if (language === 'he') {
    return normalizeHebrewWord(word);
  }
  return word.toUpperCase();
}

/**
 * Check if a word is valid for daily challenge submission.
 * Valid means: in dictionary OR community-validated (6+ net votes).
 * Pending words (awaiting community validation) are NOT valid.
 */
export function isWordValidForDailyChallenge(word: string, language: Language): boolean {
  // Check static dictionary first
  const inDictionary = isDictionaryWord(word, language);
  if (inDictionary === true) {
    return true;
  }

  // Check community-validated words (6+ net votes)
  if (isWordCommunityValid(word, language)) {
    return true;
  }

  // Pending words and unknown words are NOT valid
  return false;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Validate language code
 */
export function isValidLanguage(language: string): language is ValidLanguage {
  return VALID_LANGUAGES.includes(language as ValidLanguage);
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
