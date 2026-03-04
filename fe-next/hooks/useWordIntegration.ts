import { useCallback } from 'react';
import type { Language } from '@/shared/types';
import {
  checkWordIntegrationAsync,
  checkWordIntegration,
} from './wordIntegrationLogic';

// Re-export pure functions and types for backward compatibility
export type { WordIntegrationResult } from './wordIntegrationLogic';
export { checkWordIntegrationAsync, checkWordIntegration } from './wordIntegrationLogic';

/**
 * React hook for checking word integration
 * Provides both sync (optimistic) and async (accurate) checking
 */
export function useWordIntegration() {
  /**
   * Check a single word (async with API dictionary lookup)
   */
  const checkWordAsync = useCallback(
    async (word: string, language: Language): Promise<Awaited<ReturnType<typeof checkWordIntegrationAsync>>> => {
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
    async (words: string[], language: Language) => {
      return Promise.all(words.map((w) => checkWordIntegrationAsync(w, language)));
    },
    []
  );

  /**
   * Synchronous check (length only, optimistic for valid-length words)
   * Use checkWordAsync for accurate dictionary validation
   */
  const checkWordSync = useCallback(
    (word: string, language: Language) => {
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
