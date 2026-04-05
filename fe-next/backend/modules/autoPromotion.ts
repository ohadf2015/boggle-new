/**
 * Auto-Promotion Module
 * Automatically promotes invalid words to the dictionary when confidence signals converge.
 *
 * Two promotion paths:
 * 1. Submission-based (all languages): submission_count >= MIN_SUBMISSIONS & reason = 'not_in_dictionary'
 * 2. Milog-based (Hebrew only): milog_status = 'verified' — immediate, no threshold
 */

import logger from '../utils/logger';
import { addToCommunityCache } from './communityWordManager';
import { getVerifiedWordsForPromotion } from '../services/milogWordVerifier';
import { getSupabase } from './supabaseServer';

export const AUTO_PROMOTION_CONFIG = {
  MIN_SUBMISSIONS: 10,
  BATCH_LIMIT: 200,
  VOTES_TO_ADD: 10,
} as const;

export interface AutoPromotionResult {
  promoted: number;
  failed: number;
  skipped?: boolean;
  words: {
    submissionBased: string[];
    milogBased: string[];
  };
}

// In-memory lock to prevent concurrent runs
let isRunning = false;

/** Test-only: reset the lock */
export function _resetLockForTesting(): void {
  isRunning = false;
}

/**
 * Run the auto-promotion pipeline
 * 1. Submission-based: high-count not_in_dictionary words
 * 2. Milog-based: verified Hebrew words
 */
export async function runAutoPromotion(): Promise<AutoPromotionResult> {
  if (isRunning) {
    logger.warn('AUTO_PROMOTE', 'Skipped: another run is in progress');
    return { promoted: 0, failed: 0, skipped: true, words: { submissionBased: [], milogBased: [] } };
  }

  isRunning = true;
  const result: AutoPromotionResult = {
    promoted: 0,
    failed: 0,
    words: { submissionBased: [], milogBased: [] },
  };

  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('AUTO_PROMOTE', 'Supabase client not available');
      return result;
    }

    // --- Path 1: Submission-based promotion ---
    await promoteBySubmissionCount(supabase, result);

    // --- Path 2: Milog-verified Hebrew words ---
    await promoteByMilogVerification(supabase, result);

    logger.info('AUTO_PROMOTE', `Complete: ${result.promoted} promoted, ${result.failed} failed`);
    return result;
  } finally {
    isRunning = false;
  }
}

async function promoteBySubmissionCount(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  result: AutoPromotionResult
): Promise<void> {
  const { data: candidates, error } = await supabase.rpc('get_auto_promotion_candidates', {
    p_min_submissions: AUTO_PROMOTION_CONFIG.MIN_SUBMISSIONS,
    p_limit: AUTO_PROMOTION_CONFIG.BATCH_LIMIT,
  });

  if (error) {
    logger.error('AUTO_PROMOTE', `RPC error: ${error.message}`);
    return;
  }

  if (!candidates || candidates.length === 0) {
    logger.info('AUTO_PROMOTE', 'No submission-based candidates');
    return;
  }

  logger.info('AUTO_PROMOTE', `Processing ${candidates.length} submission-based candidates`);

  for (const candidate of candidates) {
    try {
      await addToCommunityCache(candidate.word, candidate.language);

      await supabase.from('word_scores').upsert(
        {
          word: candidate.word,
          language: candidate.language,
          likes_count: AUTO_PROMOTION_CONFIG.VOTES_TO_ADD,
          dislikes_count: 0,
          first_submitter: 'auto_promoted',
          last_voted_at: new Date().toISOString(),
        },
        { onConflict: 'word,language' }
      );

      await supabase.rpc('mark_word_auto_promoted', {
        p_word_id: candidate.id,
        p_source: 'submission_threshold',
      });

      result.promoted++;
      result.words.submissionBased.push(candidate.word);
      logger.info('AUTO_PROMOTE', `Promoted (submission): ${candidate.word} [${candidate.language}]`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('AUTO_PROMOTE', `Failed to promote "${candidate.word}": ${msg}`);
    }
  }
}

async function promoteByMilogVerification(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  result: AutoPromotionResult
): Promise<void> {
  const milogWords = await getVerifiedWordsForPromotion();

  if (!milogWords || milogWords.length === 0) {
    logger.info('AUTO_PROMOTE', 'No milog-verified candidates');
    return;
  }

  logger.info('AUTO_PROMOTE', `Processing ${milogWords.length} milog-verified candidates`);

  for (const wordRecord of milogWords) {
    try {
      await addToCommunityCache(wordRecord.word, 'he');

      await supabase.from('word_scores').upsert(
        {
          word: wordRecord.word,
          language: 'he',
          likes_count: AUTO_PROMOTION_CONFIG.VOTES_TO_ADD,
          dislikes_count: 0,
          first_submitter: 'auto_promoted',
          last_voted_at: new Date().toISOString(),
        },
        { onConflict: 'word,language' }
      );

      await supabase.rpc('mark_word_auto_promoted', {
        p_word_id: wordRecord.id,
        p_source: 'milog_verified',
      });

      result.promoted++;
      result.words.milogBased.push(wordRecord.word);
      logger.info('AUTO_PROMOTE', `Promoted (milog): ${wordRecord.word}`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('AUTO_PROMOTE', `Failed to promote milog word "${wordRecord.word}": ${msg}`);
    }
  }
}
