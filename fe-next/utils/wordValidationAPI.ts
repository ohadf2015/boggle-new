import type { Language } from '@/types';

export interface WordWithValidation {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart?: number;
  isValid: boolean | null;
  comboBonus?: number;
  fireRoundBonus?: number;
}

export interface ValidationResult {
  word: string;
  isValid: boolean;
}

export interface BatchValidationResponse {
  success: boolean;
  results: ValidationResult[];
}

/**
 * Batch validates words using the AI validation API.
 * Returns a map of word -> isValid for quick lookup.
 *
 * @param words - Array of words to validate
 * @param language - Language for validation (e.g., 'en', 'he')
 * @param minWordLength - Minimum word length (default: 3)
 * @returns Map of word to validation result, or null on error
 *
 * @example
 * const validationMap = await batchValidateWords(['hello', 'world'], 'en');
 * if (validationMap) {
 *   const isHelloValid = validationMap.get('hello'); // true/false
 * }
 */
export async function batchValidateWords(
  words: string[],
  language: Language,
  minWordLength: number = 3
): Promise<Map<string, boolean> | null> {
  if (words.length === 0) {
    return new Map();
  }

  try {
    const response = await fetch('/api/validate-words-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        words,
        language,
        minWordLength,
      }),
    });

    if (!response.ok) {
      console.warn(`AI validation API returned ${response.status}`);
      return null;
    }

    const result: BatchValidationResponse = await response.json();

    if (result.success && Array.isArray(result.results)) {
      const validationMap = new Map<string, boolean>();
      for (const r of result.results) {
        validationMap.set(r.word, r.isValid);
      }
      return validationMap;
    }

    return null;
  } catch (error) {
    console.error('Word validation API error:', error);
    return null;
  }
}

/**
 * Finalizes word validation for a list of words with pending validation status.
 * Updates the isValid field based on API results, marking as false on error.
 *
 * @param words - Array of words with potential pending validations
 * @param language - Language for validation
 * @param minWordLength - Minimum word length (default: 3)
 * @returns Updated array with all words having definitive isValid status
 *
 * @example
 * const finalizedWords = await finalizeWordValidation(foundWords, 'en');
 * const validWords = finalizedWords.filter(w => w.isValid === true);
 */
export async function finalizeWordValidation<T extends WordWithValidation>(
  words: T[],
  language: Language,
  minWordLength: number = 3
): Promise<T[]> {
  const pendingWords = words.filter(w => w.isValid === null);

  if (pendingWords.length === 0) {
    return words;
  }

  const validationMap = await batchValidateWords(
    pendingWords.map(w => w.word),
    language,
    minWordLength
  );

  if (!validationMap) {
    // On error, mark all pending words as invalid
    return words.map(w =>
      w.isValid === null ? { ...w, isValid: false } : w
    );
  }

  // Update words with validation results
  return words.map(w => {
    if (w.isValid === null) {
      const isValid = validationMap.get(w.word) ?? false;
      return { ...w, isValid };
    }
    return w;
  });
}

/**
 * Calculates final score from words, counting only validated words.
 *
 * @param words - Array of words with validation status
 * @returns Total score from valid words only
 */
export function calculateValidatedScore(words: WordWithValidation[]): number {
  return words
    .filter(w => w.isValid === true)
    .reduce((sum, w) => sum + w.score + (w.comboBonus || 0) + (w.fireRoundBonus || 0), 0);
}
