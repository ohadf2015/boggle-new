/**
 * Word Bank Service
 *
 * Manages the daily challenge word bank with multiple word sources:
 * 1. Database word bank (curated, admin-managed)
 * 2. Main validation dictionary (npm packages + approved files)
 * 3. Static fallback lists (hardcoded for reliability)
 *
 * @module lib/dailyChallenge/wordBankService
 */

import type { Language } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { WORD_LENGTH_RANGE, STATIC_WORD_LISTS, type WordBankEntry } from './wordBankData';
import { validateGameWord } from '@/utils/dailyChallenge/wikipediaWordProcessor';

import logger from '@/backend/utils/logger';

// Re-export types and data from wordBankData
export type { ValidationStatus, WordStatus, WordBankEntry } from './wordBankData';
export { STATIC_WORD_LISTS, WORD_LENGTH_RANGE } from './wordBankData';

// Re-export all admin operations
export {
  seedWordBank,
  importWordsFromDictionary,
  importWikipediaWordsToBank,
  importWikipediaWordWithMetadata,
  blockWord,
  unblockWord,
  markWordAsUsed,
  getWordBankStats,
  getWordBankWords,
  deleteWordFromBank,
  updateValidationStatus,
  bulkUpdateValidationStatus,
  bulkImportWords,
  getPendingWords,
  approveWord,
  rejectWord,
} from './wordBankAdmin';

/**
 * Get random words from the word bank table
 */
export async function getWordsFromWordBank(
  supabase: SupabaseClient,
  language: Language,
  count: number,
  excludeWords: Set<string>
): Promise<WordBankEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_random_words_from_bank', {
      p_language: language,
      p_count: count,
      p_exclude_words: Array.from(excludeWords),
      p_min_days_since_used: 30,
    });

    if (error) {
      logger.error('WORD_BANK', 'Error fetching from word bank:', error);
      return [];
    }

    // Filter out words that fail validation (e.g., Hebrew transliterations)
    return (data || [])
      .filter((row: { word: string }) => validateGameWord(row.word, language).valid)
      .map((row: { word: string; source: string; difficulty_score: number; category: string }) => ({
        word: row.word.toUpperCase(),
        source: 'word_bank' as const,
        difficulty_score: row.difficulty_score,
        category: row.category,
      }));
  } catch (error) {
    logger.error('WORD_BANK', 'Word bank query failed:', error);
    return [];
  }
}

/**
 * Get random words from the static fallback list
 */
export function getWordsFromStaticList(
  language: Language,
  count: number,
  excludeWords: Set<string>
): WordBankEntry[] {
  const wordList = STATIC_WORD_LISTS[language] || STATIC_WORD_LISTS.en;
  const lengthRange = WORD_LENGTH_RANGE[language];

  const availableWords = wordList.filter(word => {
    const normalizedWord = word.toUpperCase();
    return (
      normalizedWord.length >= lengthRange.min &&
      normalizedWord.length <= lengthRange.max &&
      !excludeWords.has(normalizedWord)
    );
  });

  const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(word => ({
    word: word.toUpperCase(),
    source: 'static' as const,
  }));
}
