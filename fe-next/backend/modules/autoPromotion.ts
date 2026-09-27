/**
 * Auto-Promotion Module
 * Promotes invalid words to the dictionary when an external authority confirms them.
 *
 * Promotion paths (ALL gated by the offensive filter):
 * 1. Milog-verified (Hebrew)
 * 2. Wiktionary-verified (English)
 * 3. Wiktionary-verified (Spanish)
 *
 * The old unverified `submission_count >= N` path was REMOVED on 2026-05-23
 * (dictionary-self-improvement): it promoted any string that was submitted
 * enough times with no content check — a slur/abuse risk on a 15+/TV party
 * game, and useless at real volume. Verification is now the only auto gate;
 * submission count is a *priority* signal inside the verification queue.
 * Off-Wiktionary real words are handled by the admin review UI.
 */

import logger from '../utils/logger';
import { addToCommunityCache } from './communityWordManager';
import { getVerifiedWordsForPromotion } from '../services/milogWordVerifier';
import { getVerifiedEnglishWordsForPromotion } from '../services/wiktionaryEnVerifier';
import { getVerifiedSpanishWordsForPromotion } from '../services/wiktionaryEsVerifier';
import { getVerifiedWordsForPromotionByLang } from '../services/wiktionaryVerifier';
import { isOffensiveWord } from '../services/wiktionaryOffensiveFilter';
import { getSupabase } from './supabaseServer';
import { promoteWordToScores } from './wordPromotion';
import { emitDictionaryRun } from './dictionaryPipelineTelemetry';

export const AUTO_PROMOTION_CONFIG = {
  BATCH_LIMIT: 200,
  VOTES_TO_ADD: 10,
} as const;

export interface AutoPromotionResult {
  promoted: number;
  failed: number;
  /** Verified words skipped because Wiktionary flagged them offensive/slur. */
  blocked: number;
  skipped?: boolean;
  words: {
    milogBased: string[];
    wiktionaryBased: string[];
    wiktionaryEsBased: string[];
    wiktionarySvBased: string[];
    jishoBased: string[];
  };
}

type Supa = NonNullable<ReturnType<typeof getSupabase>>;
type VerifiedWord = { id: string; word: string; url: string | null };

// In-memory lock to prevent concurrent runs
let isRunning = false;

/** Test-only: reset the lock */
export function _resetLockForTesting(): void {
  isRunning = false;
}

export async function runAutoPromotion(): Promise<AutoPromotionResult> {
  if (isRunning) {
    logger.warn('AUTO_PROMOTE', 'Skipped: another run is in progress');
    return { promoted: 0, failed: 0, blocked: 0, skipped: true, words: { milogBased: [], wiktionaryBased: [], wiktionaryEsBased: [], wiktionarySvBased: [], jishoBased: [] } };
  }

  isRunning = true;
  const result: AutoPromotionResult = {
    promoted: 0,
    failed: 0,
    blocked: 0,
    words: { milogBased: [], wiktionaryBased: [], wiktionaryEsBased: [], wiktionarySvBased: [], jishoBased: [] },
  };

  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('AUTO_PROMOTE', 'Supabase client not available');
      return result;
    }

    // Path 1: Milog-verified Hebrew words
    const milog = await getVerifiedWordsForPromotion();
    await promoteVerified(supabase, milog, 'he', 'milog_verified', result.words.milogBased, result);

    // Path 2: Wiktionary-verified English words
    const en = await getVerifiedEnglishWordsForPromotion();
    await promoteVerified(supabase, en, 'en', 'wiktionary_verified', result.words.wiktionaryBased, result);

    // Path 3: Wiktionary-verified Spanish words
    const es = await getVerifiedSpanishWordsForPromotion();
    await promoteVerified(supabase, es, 'es', 'wiktionary_es_verified', result.words.wiktionaryEsBased, result);

    // Path 4: Wiktionary-verified Swedish words
    const sv = await getVerifiedWordsForPromotionByLang('sv');
    await promoteVerified(supabase, sv, 'sv', 'wiktionary_sv_verified', result.words.wiktionarySvBased, result);

    // Path 5: Jisho/JMdict-verified Japanese words (offensive already filtered at verify time)
    const ja = await getVerifiedWordsForPromotionByLang('ja');
    await promoteVerified(supabase, ja, 'ja', 'jisho_verified', result.words.jishoBased, result);

    logger.info('AUTO_PROMOTE', `Complete: ${result.promoted} promoted, ${result.blocked} blocked, ${result.failed} failed`);
    await emitDictionaryRun('promote', { promoted: result.promoted, blocked: result.blocked, failed: result.failed });
    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * Promote a batch of externally-verified words for one language, skipping any
 * the offensive filter flags. Per-word failures never abort the batch.
 */
async function promoteVerified(
  supabase: Supa,
  words: VerifiedWord[] | null | undefined,
  language: string,
  source: string,
  bucket: string[],
  result: AutoPromotionResult
): Promise<void> {
  if (!words || words.length === 0) {
    logger.info('AUTO_PROMOTE', `No ${source} candidates`);
    return;
  }

  logger.info('AUTO_PROMOTE', `Processing ${words.length} ${source} candidates`);

  for (const wordRecord of words) {
    try {
      // Safety gate — Wiktionary's own labels (slur/offensive/vulgar) block it.
      if (await isOffensiveWord(wordRecord.word, language)) {
        result.blocked++;
        logger.warn('AUTO_PROMOTE', `Blocked (offensive): ${wordRecord.word} [${language}]`);
        // Mark so it is removed from the verified-promotion queue permanently.
        await supabase.rpc('update_verification_result', {
          p_word_id: wordRecord.id,
          p_status: 'rejected_type',
          p_source: 'offensive_filter',
          p_url: null,
          p_word_type: null,
          p_error: 'blocked: offensive/slur label',
        });
        continue;
      }

      await addToCommunityCache(wordRecord.word, language);
      await promoteWordToScores(supabase, wordRecord.word, language, {
        votes: AUTO_PROMOTION_CONFIG.VOTES_TO_ADD,
        submitter: 'auto_promoted',
      });
      await supabase.rpc('mark_word_auto_promoted', {
        p_word_id: wordRecord.id,
        p_source: source,
      });

      result.promoted++;
      bucket.push(wordRecord.word);
      logger.info('AUTO_PROMOTE', `Promoted (${source}): ${wordRecord.word} [${language}]`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('AUTO_PROMOTE', `Failed to promote "${wordRecord.word}": ${msg}`);
    }
  }
}
