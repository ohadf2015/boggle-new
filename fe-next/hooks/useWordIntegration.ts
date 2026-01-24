import { isDictionaryWord } from '@/backend/dictionary';
import type { Language } from '@/shared/types';

/**
 * Result of word integration check
 */
export interface WordIntegrationResult {
  /** Normalized word (trimmed, lowercase) */
  word: string;
  /** Whether word can be integrated into game grids */
  canIntegrate: boolean;
  /** Reason why word cannot be integrated (if canIntegrate is false) */
  reason?: 'word_empty' | 'word_too_short' | 'word_too_long' | 'word_not_in_dictionary';
}

const MIN_LENGTH = 3;
const MAX_LENGTH = 12;

/**
 * Check if a word can be integrated into future game grids
 *
 * Dictionary words (3-12 chars) can be embedded in grids.
 * Non-dictionary words or words outside length bounds are tracked only.
 *
 * @param word - Word to check
 * @param language - Language code
 * @returns Integration result with word, canIntegrate flag, and optional reason
 *
 * @example
 * checkWordIntegration('cat', 'en')
 * // => { word: 'cat', canIntegrate: true, reason: undefined }
 *
 * checkWordIntegration('xyzabc', 'en')
 * // => { word: 'xyzabc', canIntegrate: false, reason: 'word_not_in_dictionary' }
 */
export function checkWordIntegration(word: string, language: Language): WordIntegrationResult {
  // Normalize: trim and lowercase
  const normalized = word.trim().toLowerCase();

  // Empty check (highest priority)
  if (!normalized) {
    return { word: normalized, canIntegrate: false, reason: 'word_empty' };
  }

  // Length checks (before dictionary check for performance)
  if (normalized.length < MIN_LENGTH) {
    return { word: normalized, canIntegrate: false, reason: 'word_too_short' };
  }
  if (normalized.length > MAX_LENGTH) {
    return { word: normalized, canIntegrate: false, reason: 'word_too_long' };
  }

  // Dictionary check
  // isDictionaryWord returns: true (in dict), false (not in dict), null (dict not loaded)
  const inDictionary = isDictionaryWord(normalized, language);

  // If dictionary not loaded (null) or word not found (false), cannot integrate
  if (inDictionary !== true) {
    return { word: normalized, canIntegrate: false, reason: 'word_not_in_dictionary' };
  }

  // Valid dictionary word within length bounds
  return { word: normalized, canIntegrate: true, reason: undefined };
}

/**
 * React hook for checking word integration
 * Provides batch checking functionality
 */
export function useWordIntegration() {
  /**
   * Check multiple words at once
   * @param words - Array of words to check
   * @param language - Language code
   * @returns Array of integration results
   */
  const checkWords = (words: string[], language: Language): WordIntegrationResult[] => {
    return words.map(word => checkWordIntegration(word, language));
  };

  return { checkWordIntegration, checkWords };
}
