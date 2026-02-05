/**
 * Dictionary Enrichment Module
 * Handles promoting milog-verified words to the Hebrew dictionary
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger';
import {
  getVerifiedWordsForPromotion,
  markWordPromoted,
} from '../services/milogWordVerifier';

// Hebrew final letter normalization (same as dictionary.ts)
const hebrewFinalLetters: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ',
};

/**
 * Normalize Hebrew word for dictionary storage
 * Converts final letters to standard forms
 */
export function normalizeHebrewWordForDictionary(word: string): string {
  return word
    .split('')
    .map(letter => hebrewFinalLetters[letter] || letter)
    .join('');
}

/**
 * Get the path to the Hebrew approved words file
 */
function getHebrewApprovedPath(): string {
  return path.resolve(__dirname, '../hebrew_words_approved.txt');
}

/**
 * Add a word to the Hebrew dictionary file
 * Appends normalized word to hebrew_words_approved.txt
 */
export async function addWordToHebrewDictionary(
  word: string,
  dictionaryPath?: string
): Promise<boolean> {
  const filePath = dictionaryPath || getHebrewApprovedPath();
  const normalizedWord = normalizeHebrewWordForDictionary(word);

  try {
    await fs.appendFile(filePath, `${normalizedWord}\n`, 'utf-8');
    logger.info('DICT_ENRICH', `Added word to dictionary: ${word} -> ${normalizedWord}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('DICT_ENRICH', `Failed to add word to dictionary: ${word} - ${errorMessage}`);
    return false;
  }
}

/**
 * Add word to in-memory dictionary (hot-reload)
 * Imports dictionary lazily to avoid circular dependencies
 */
async function addWordToInMemoryDictionary(word: string): Promise<void> {
  try {
    const { dictionary } = await import('../dictionary');
    if (dictionary.hebrewWords) {
      const normalizedWord = normalizeHebrewWordForDictionary(word);
      dictionary.hebrewWords.add(normalizedWord);
      logger.debug('DICT_ENRICH', `Added word to in-memory dictionary: ${normalizedWord}`);
    }
  } catch (error) {
    // Ignore errors - in-memory update is optional
    logger.debug('DICT_ENRICH', `Could not add word to in-memory dictionary: ${word}`);
  }
}

/**
 * Result of promoting words to dictionary
 */
export interface PromotionResult {
  promoted: number;
  failed: number;
  words: string[];
}

/**
 * Promote verified words from milog to the Hebrew dictionary
 * 1. Fetches verified words from Supabase
 * 2. Adds each word to the dictionary file
 * 3. Updates in-memory dictionary
 * 4. Marks word as promoted in database
 */
export async function promoteVerifiedWordsToDictionary(
  limit: number = 100
): Promise<PromotionResult> {
  const result: PromotionResult = {
    promoted: 0,
    failed: 0,
    words: [],
  };

  try {
    // Get verified words from database
    const verifiedWords = await getVerifiedWordsForPromotion(limit);

    if (verifiedWords.length === 0) {
      logger.info('DICT_ENRICH', 'No verified words to promote');
      return result;
    }

    logger.info('DICT_ENRICH', `Promoting ${verifiedWords.length} verified words to dictionary`);

    // Process each word
    for (const wordRecord of verifiedWords) {
      try {
        // Add to dictionary file
        const success = await addWordToHebrewDictionary(wordRecord.word);

        if (success) {
          // Add to in-memory dictionary
          await addWordToInMemoryDictionary(wordRecord.word);

          // Mark as promoted in database
          await markWordPromoted(wordRecord.id);

          result.promoted++;
          result.words.push(wordRecord.word);
          logger.info('DICT_ENRICH', `✓ Promoted: ${wordRecord.word}`);
        } else {
          result.failed++;
          logger.warn('DICT_ENRICH', `✗ Failed to promote: ${wordRecord.word}`);
        }
      } catch (wordError) {
        result.failed++;
        const errorMessage = wordError instanceof Error ? wordError.message : String(wordError);
        logger.error('DICT_ENRICH', `Error promoting word "${wordRecord.word}": ${errorMessage}`);
      }
    }

    logger.info('DICT_ENRICH', `Promotion complete: ${result.promoted} promoted, ${result.failed} failed`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('DICT_ENRICH', `Error in promoteVerifiedWordsToDictionary: ${errorMessage}`);
    throw error;
  }
}

/**
 * Run the complete dictionary enrichment pipeline
 * 1. Process milog verification queue
 * 2. Promote verified words to dictionary
 */
export async function runDictionaryEnrichment(): Promise<{
  verification: { processed: number; verified: number };
  promotion: PromotionResult;
}> {
  const { processMilogVerificationQueue } = await import('../services/milogWordVerifier');

  logger.info('DICT_ENRICH', '=== Starting Dictionary Enrichment ===');

  // Step 1: Process verification queue
  logger.info('DICT_ENRICH', 'Step 1: Processing milog verification queue...');
  const verificationResult = await processMilogVerificationQueue();

  // Step 2: Promote verified words
  logger.info('DICT_ENRICH', 'Step 2: Promoting verified words to dictionary...');
  const promotionResult = await promoteVerifiedWordsToDictionary();

  logger.info('DICT_ENRICH', '=== Dictionary Enrichment Complete ===');
  logger.info('DICT_ENRICH', `Verification: ${verificationResult.verified} verified, ${verificationResult.notFound} not found`);
  logger.info('DICT_ENRICH', `Promotion: ${promotionResult.promoted} promoted, ${promotionResult.failed} failed`);

  return {
    verification: {
      processed: verificationResult.processed,
      verified: verificationResult.verified,
    },
    promotion: promotionResult,
  };
}
