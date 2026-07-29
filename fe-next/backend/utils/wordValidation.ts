/**
 * Shared Word Validation Utility (M2 fix)
 *
 * Extracted from wordHandler.ts to be reused by duel handlers.
 * Validates a word against dictionary, board, and calculates score.
 * Does NOT include game-specific logic (combos, first-finder, community validation).
 */

import { isDictionaryWord } from '@/backend/dictionary';
import { isWordOnBoardAsync } from '@/backend/modules/wordValidatorPool';
import { calculateWordScore } from '@/backend/modules/scoringEngine.types';
import type { Language } from '@/shared/types';

// ============================================
// TYPES
// ============================================

export interface WordValidationResult {
  valid: boolean;
  reason?: 'duplicate' | 'not_in_dictionary' | 'not_on_board' | 'too_short';
  score: number;
  normalizedWord: string;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a word against dictionary and board, and calculate its score.
 *
 * @param word - The word to validate
 * @param boardState - 2D grid of letters
 * @param language - Language for dictionary lookup
 * @param playerWords - Already-found words (for duplicate check)
 * @param minLength - Minimum word length (default 3)
 * @returns Validation result with score
 */
export async function validateAndScoreWord(
  word: string,
  boardState: string[][],
  language: Language | string,
  playerWords: string[],
  minLength = 3
): Promise<WordValidationResult> {
  const normalizedWord = word.toLowerCase().trim();

  // Check minimum length
  if (normalizedWord.length < minLength) {
    return { valid: false, reason: 'too_short', score: 0, normalizedWord };
  }

  // Check duplicate
  if (playerWords.includes(normalizedWord)) {
    return { valid: false, reason: 'duplicate', score: 0, normalizedWord };
  }

  // Check dictionary
  const inDictionary = isDictionaryWord(normalizedWord, language as Language);
  if (!inDictionary) {
    return { valid: false, reason: 'not_in_dictionary', score: 0, normalizedWord };
  }

  // Check board
  const onBoard = await isWordOnBoardAsync(normalizedWord, boardState);
  if (!onBoard) {
    return { valid: false, reason: 'not_on_board', score: 0, normalizedWord };
  }

  // Calculate score (combo is caller's responsibility)
  const score = calculateWordScore(normalizedWord, 0);

  return { valid: true, score, normalizedWord };
}
