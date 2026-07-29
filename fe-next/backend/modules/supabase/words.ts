/**
 * Words Module
 * Community words, player words, and invalid word tracking
 */

import { getSupabase } from './client';

import logger from '../../utils/logger';

export interface WordApprovalInput {
  word: string;
  language: string;
  gameCode: string;
  hostUserId?: string | null;
  promoted?: boolean;
}

export interface PlayerWordInput {
  word: string;
  language: string;
  gameCode: string;
  playerId?: string | null;
}

/** Valid reasons for invalid word submissions */
export type InvalidWordReason = 'not_on_board' | 'not_in_dictionary' | 'peer_rejected';

/**
 * Save a host-approved word that wasn't in the dictionary to Supabase
 */
export async function saveHostApprovedWord(params: WordApprovalInput): Promise<{ data: unknown; error: { message: string } | null; isNewWord: boolean }> {
  const { word, language, gameCode, hostUserId, promoted = false } = params;
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' }, isNewWord: false };

  try {
    // Atomic upsert via RPC. Replaces SELECT-then-UPDATE which lost
    // increments under concurrent writers (last writer wins on COUNT).
    const { data: rpcRows, error: rpcError } = await client
      .rpc('upsert_community_word', {
        p_word: word,
        p_language: language,
        p_user_id: hostUserId ?? null,
        p_game_code: gameCode,
        p_promoted: promoted,
      });

    if (rpcError || !rpcRows || (Array.isArray(rpcRows) && rpcRows.length === 0)) {
      logger.error('SUPABASE', `Error upserting community word "${word}"`, rpcError?.message);
      return { data: null, error: rpcError ?? { message: 'upsert_community_word returned no row' }, isNewWord: false };
    }

    const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as { out_id: string; out_approval_count: number; out_is_new_word: boolean };
    const wordRecord = { id: row.out_id, approval_count: row.out_approval_count };
    const isNewWord = row.out_is_new_word;

    // Record the individual approval event (best-effort — failures are warned, not propagated)
    const { error: approvalError } = await client
      .from('community_word_approvals')
      .insert({
        word_id: row.out_id,
        approved_by: hostUserId,
        game_code: gameCode
      });

    if (approvalError) {
      logger.warn('SUPABASE', `Error recording approval for "${word}"`, approvalError.message);
    }

    logger.debug('SUPABASE', `${isNewWord ? 'Saved new' : 'Updated'} community word "${word}" (${language}) - approval count: ${row.out_approval_count}${promoted ? ' - PROMOTED' : ''}`);
    return { data: wordRecord, error: null, isNewWord };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('SUPABASE', `Unexpected error saving word "${word}"`, err);
    return { data: null, error: { message: errorMessage }, isNewWord: false };
  }
}

/**
 * Save a valid player word to the database for bot learning
 */
export async function savePlayerWord(params: PlayerWordInput): Promise<{ data: unknown; error: { message: string } | null; isNewWord: boolean }> {
  const { word, language, gameCode, playerId } = params;
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' }, isNewWord: false };

  // Normalize word
  const normalizedWord = word.toLowerCase().trim();

  try {
    // Atomic upsert via RPC. Replaces SELECT-then-UPDATE which lost
    // increments under concurrent writers (two T's both reading N → both writing N+1).
    const { data: rpcRows, error: rpcError } = await client
      .rpc('upsert_player_word', {
        p_word: normalizedWord,
        p_language: language,
        p_player_id: playerId ?? null,
        p_game_code: gameCode,
      });

    if (rpcError || !rpcRows || (Array.isArray(rpcRows) && rpcRows.length === 0)) {
      logger.error('SUPABASE', `Error upserting player word "${normalizedWord}"`, rpcError?.message);
      return { data: null, error: rpcError ?? { message: 'upsert_player_word returned no row' }, isNewWord: false };
    }

    const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as { out_id: string; out_times_submitted: number; out_is_new_word: boolean };
    logger.debug('SUPABASE', `${row.out_is_new_word ? 'Saved new' : 'Updated'} player word "${normalizedWord}" (${language}) - times submitted: ${row.out_times_submitted}`);
    return { data: { id: row.out_id, times_submitted: row.out_times_submitted }, error: null, isNewWord: row.out_is_new_word };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('SUPABASE', `Unexpected error saving player word "${normalizedWord}"`, err);
    return { data: null, error: { message: errorMessage }, isNewWord: false };
  }
}

/**
 * Get popular player words for a language (for bot word selection)
 */
export async function getPopularPlayerWords(language: string, limit: number = 500): Promise<{ data: string[]; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await client
      .from('player_words')
      .select('word, times_submitted')
      .eq('language', language)
      .order('times_submitted', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SUPABASE', `Error fetching popular player words for ${language}`, error.message);
      return { data: [], error };
    }

    // Return just the words array
    const words = data.map((row: { word: string }) => row.word);
    logger.debug('SUPABASE', `Fetched ${words.length} popular player words for ${language}`);
    return { data: words, error: null };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('SUPABASE', `Unexpected error fetching player words`, err);
    return { data: [], error: { message: errorMessage } };
  }
}

/**
 * Increment bot usage counter for a word
 */
export async function incrementBotWordUsage(word: string, language: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const normalizedWord = word.toLowerCase().trim();

  try {
    // Update times_found_by_bots
    await client.rpc('increment_bot_word_usage', {
      p_word: normalizedWord,
      p_language: language
    });
  } catch (err: unknown) {
    // Silently fail - this is not critical
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.debug('SUPABASE', `Could not increment bot usage for "${normalizedWord}": ${errorMessage}`);
  }
}

/**
 * Record an invalid word submission from a player
 * Tracks words that fail validation with submission counters.
 * Admins can review words submitted 3+ times and approve them.
 * @param word - The invalid word submitted
 * @param language - Game language
 * @param reason - Why the word was invalid (default: 'not_in_dictionary')
 */
// Batch buffer for wrong word recording to avoid per-word Supabase calls
const wrongWordBuffer: Array<{ word: string; language: string; reason: InvalidWordReason }> = [];
let wrongWordFlushTimer: ReturnType<typeof setTimeout> | null = null;
const WRONG_WORD_FLUSH_INTERVAL = 5000; // Flush every 5 seconds
const WRONG_WORD_BATCH_SIZE = 20; // Or when buffer reaches this size

async function flushWrongWordBuffer(): Promise<void> {
  if (wrongWordBuffer.length === 0) return;

  const batch = wrongWordBuffer.splice(0, WRONG_WORD_BATCH_SIZE);
  const client = getSupabase();
  if (!client) return;

  // Process batch sequentially (each is a single RPC call)
  for (const entry of batch) {
    try {
      await client.rpc('record_invalid_word_submission', {
        p_word: entry.word,
        p_language: entry.language,
        p_reason: entry.reason
      });
    } catch {
      // Non-critical, skip failures
    }
  }

  logger.debug('SUPABASE', `Flushed ${batch.length} invalid word record(s)`);

  // If more items remain, schedule another flush
  if (wrongWordBuffer.length > 0) {
    wrongWordFlushTimer = setTimeout(() => flushWrongWordBuffer(), WRONG_WORD_FLUSH_INTERVAL);
  }
}

export async function recordPlayerWrongWord(
  word: string,
  language: string,
  reason: InvalidWordReason = 'not_in_dictionary'
): Promise<void> {
  if (!getSupabase()) return;

  const normalizedWord = word.toLowerCase().trim();
  if (normalizedWord.length < 2) return;

  wrongWordBuffer.push({ word: normalizedWord, language, reason });

  // Flush immediately if batch size reached, otherwise debounce
  if (wrongWordBuffer.length >= WRONG_WORD_BATCH_SIZE) {
    if (wrongWordFlushTimer) clearTimeout(wrongWordFlushTimer);
    wrongWordFlushTimer = null;
    flushWrongWordBuffer().catch(() => {});
  } else if (!wrongWordFlushTimer) {
    wrongWordFlushTimer = setTimeout(() => {
      wrongWordFlushTimer = null;
      flushWrongWordBuffer().catch(() => {});
    }, WRONG_WORD_FLUSH_INTERVAL);
  }
}

// CommonJS exports for backward compatibility
module.exports = {
  saveHostApprovedWord,
  savePlayerWord,
  getPopularPlayerWords,
  incrementBotWordUsage,
  recordPlayerWrongWord,
};
