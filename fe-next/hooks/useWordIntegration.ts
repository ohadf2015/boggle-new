import { useCallback } from 'react';
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
 * Check if a word can be integrated into future game grids (synchronous pre-check)
 *
 * Performs length validation only (no dictionary check).
 * Use checkWordIntegrationAsync for full validation including dictionary.
 *
 * @param word - Word to check
 * @returns Partial integration result (length checks only)
 */
function checkWordLengthSync(word: string): WordIntegrationResult | null {
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

  // Length is valid, need dictionary check
  return null;
}

/**
 * Check if a word can be integrated into future game grids (async with API)
 *
 * Dictionary words (3-12 chars) can be embedded in grids.
 * Non-dictionary words or words outside length bounds are tracked only.
 *
 * @param word - Word to check
 * @param language - Language code
 * @returns Integration result with word, canIntegrate flag, and optional reason
 *
 * @example
 * await checkWordIntegrationAsync('cat', 'en')
 * // => { word: 'cat', canIntegrate: true, reason: undefined }
 *
 * await checkWordIntegrationAsync('xyzabc', 'en')
 * // => { word: 'xyzabc', canIntegrate: false, reason: 'word_not_in_dictionary' }
 */
export async function checkWordIntegrationAsync(
  word: string,
  language: Language
): Promise<WordIntegrationResult> {
  const normalized = word.trim().toLowerCase();

  // Fast path: check length first (no API call needed)
  const lengthResult = checkWordLengthSync(word);
  if (lengthResult) {
    return lengthResult;
  }

  // Dictionary check via API
  try {
    const response = await fetch('/api/validate-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalized, language }),
    });

    if (!response.ok) {
      // API error - assume not in dictionary for safety
      return { word: normalized, canIntegrate: false, reason: 'word_not_in_dictionary' };
    }

    const data = await response.json();

    if (data.isValid) {
      return { word: normalized, canIntegrate: true, reason: undefined };
    }

    return { word: normalized, canIntegrate: false, reason: 'word_not_in_dictionary' };
  } catch {
    // Network error - assume not in dictionary for safety
    return { word: normalized, canIntegrate: false, reason: 'word_not_in_dictionary' };
  }
}

/**
 * Synchronous word integration check (length only, no dictionary)
 *
 * For backwards compatibility. Returns optimistic result for valid-length words.
 * Use checkWordIntegrationAsync for accurate dictionary validation.
 *
 * @deprecated Use checkWordIntegrationAsync for accurate results
 */
export function checkWordIntegration(word: string, _language: Language): WordIntegrationResult {
  const normalized = word.trim().toLowerCase();

  // Check length constraints
  const lengthResult = checkWordLengthSync(word);
  if (lengthResult) {
    return lengthResult;
  }

  // Length is valid - return optimistic result
  // Dictionary validation should be done async separately if needed
  return { word: normalized, canIntegrate: true, reason: undefined };
}

/**
 * React hook for checking word integration
 * Provides both sync (optimistic) and async (accurate) checking
 */
export function useWordIntegration() {
  /**
   * Check a single word (async with API dictionary lookup)
   */
  const checkWordAsync = useCallback(
    async (word: string, language: Language): Promise<WordIntegrationResult> => {
      return checkWordIntegrationAsync(word, language);
    },
    []
  );

  /**
   * Check multiple words at once (async)
   * @param words - Array of words to check
   * @param language - Language code
   * @returns Array of integration results
   */
  const checkWords = useCallback(
    async (words: string[], language: Language): Promise<WordIntegrationResult[]> => {
      return Promise.all(words.map((w) => checkWordIntegrationAsync(w, language)));
    },
    []
  );

  /**
   * Synchronous check (length only, optimistic for valid-length words)
   * Use checkWordAsync for accurate dictionary validation
   */
  const checkWordSync = useCallback(
    (word: string, language: Language): WordIntegrationResult => {
      return checkWordIntegration(word, language);
    },
    []
  );

  return {
    checkWordIntegration: checkWordSync, // Backwards compatible (sync, optimistic)
    checkWordAsync, // New: accurate async check
    checkWords, // Updated: now async
  };
}
