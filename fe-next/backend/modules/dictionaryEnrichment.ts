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
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

/**
 * Normalize Hebrew word for dictionary storage
 * Converts final letters to standard forms
 */
export function normalizeHebrewWordForDictionary(word: string): string {
  return normalizeHebrewWord(word);
}

/**
 * Get the path to the Hebrew approved words file.
 * __dirname is unreliable inside a Next.js/Turbopack bundle (points into the
 * bundler's chunk layout, not backend/ on disk — see dictionaryLoaders.ts);
 * process.cwd() is always the project root (fe-next/) for both the custom
 * tsx server and Next itself, so anchor there instead.
 */
export function getHebrewApprovedPath(): string {
  return path.join(process.cwd(), 'backend', 'hebrew_words_approved.txt');
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
    logger.debug('DICT_ENRICH', `Failed to add word to dictionary: ${word} - ${errorMessage}`);
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
          logger.debug('DICT_ENRICH', `✗ Failed to promote: ${wordRecord.word}`);
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
  const { processWiktionaryEnVerificationQueue } = await import('../services/wiktionaryEnVerifier');
  const { processWiktionaryEsVerificationQueue } = await import('../services/wiktionaryEsVerifier');
  const { runAutoPromotion } = await import('./autoPromotion');

  logger.info('DICT_ENRICH', '=== Starting Dictionary Enrichment ===');

  // Step 1a: Hebrew via Milog
  logger.info('DICT_ENRICH', 'Step 1a: Processing milog (he) verification queue...');
  const milogResult = await processMilogVerificationQueue();

  // Step 1b: English via Wiktionary
  logger.info('DICT_ENRICH', 'Step 1b: Processing wiktionary (en) verification queue...');
  const wiktionaryResult = await processWiktionaryEnVerificationQueue();

  // Step 1c: Spanish via Wiktionary (en.wiktionary.org, body.es)
  logger.info('DICT_ENRICH', 'Step 1c: Processing wiktionary (es) verification queue...');
  const wiktionaryEsResult = await processWiktionaryEsVerificationQueue();

  // Step 2: Promote verified words via the shared, DB-backed auto-promoter
  // (same path used for en/es/sv/ja). This USED to call
  // promoteVerifiedWordsToDictionary() directly, which raced
  // startAutoPromotionCron() (every 4h) for the same `approved_at IS NULL`
  // rows: whichever cron won marked the row promoted, so when this one won
  // the word vanished into a silently-failing __dirname file write instead of
  // reaching word_scores — 1085 verified Hebrew words got stuck rejected in
  // live gameplay this way (2026-07-15 incident). runAutoPromotion() is
  // lock-guarded (isRunning), so calling it here instead is race-safe.
  logger.info('DICT_ENRICH', 'Step 2: Promoting verified words via auto-promotion...');
  const autoPromoResult = await runAutoPromotion();
  const promotionResult: PromotionResult = {
    promoted: autoPromoResult.words.milogBased.length,
    failed: autoPromoResult.failed,
    words: autoPromoResult.words.milogBased,
  };

  const totalProcessed = milogResult.processed + wiktionaryResult.processed + wiktionaryEsResult.processed;
  const totalVerified = milogResult.verified + wiktionaryResult.verified + wiktionaryEsResult.verified;

  logger.info('DICT_ENRICH', '=== Dictionary Enrichment Complete ===');
  logger.info('DICT_ENRICH', `Milog: ${milogResult.verified} verified / ${milogResult.processed} processed`);
  logger.info('DICT_ENRICH', `Wiktionary EN: ${wiktionaryResult.verified} verified / ${wiktionaryResult.processed} processed`);
  logger.info('DICT_ENRICH', `Wiktionary ES: ${wiktionaryEsResult.verified} verified / ${wiktionaryEsResult.processed} processed`);
  logger.info('DICT_ENRICH', `Promotion (he): ${promotionResult.promoted} promoted, ${promotionResult.failed} failed (cross-lang total)`);

  return {
    verification: {
      processed: totalProcessed,
      verified: totalVerified,
    },
    promotion: promotionResult,
  };
}
