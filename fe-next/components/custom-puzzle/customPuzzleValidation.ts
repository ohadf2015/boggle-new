/**
 * Custom Puzzle Word Validation
 *
 * Validates words for custom daily challenge creation using regex.
 * No dictionary lookup - just validates format:
 * - 4-8 letters only
 * - Clean characters (Unicode letters, no numbers/symbols/spaces)
 */

export const MIN_WORD_LENGTH = 4;
export const MAX_WORD_LENGTH = 8;

/**
 * Regex pattern for clean letters only (Unicode-aware)
 * Matches any Unicode letter character (supports Hebrew, Swedish, Japanese, etc.)
 */
const CLEAN_LETTERS_REGEX = /^[\p{L}]+$/u;

export type ValidationStatus = 'idle' | 'valid' | 'invalid' | 'too-short' | 'too-long';

export interface ValidationResult {
  isValid: boolean;
  status: ValidationStatus;
}

/**
 * Validate a custom puzzle word
 *
 * @param word - The word to validate
 * @returns ValidationResult with isValid flag and status
 */
export function validateCustomPuzzleWord(word: string): ValidationResult {
  // Handle empty input
  if (!word || word.length === 0) {
    return { isValid: false, status: 'idle' };
  }

  // Check length constraints
  if (word.length < MIN_WORD_LENGTH) {
    return { isValid: false, status: 'too-short' };
  }

  if (word.length > MAX_WORD_LENGTH) {
    return { isValid: false, status: 'too-long' };
  }

  // Validate clean letters only (no numbers, symbols, spaces)
  if (!CLEAN_LETTERS_REGEX.test(word)) {
    return { isValid: false, status: 'invalid' };
  }

  return { isValid: true, status: 'valid' };
}
