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
    const now = new Date().toISOString();

    // Try insert first. If the word already exists, the unique constraint
    // returns error code 23505 instead of the old SELECT-then-INSERT race.
    const { data: inserted, error: insertError } = await client
      .from('community_words')
      .insert({
        word,
        language,
        approval_count: 1,
        promoted_to_dictionary: promoted,
        promoted_at: promoted ? now : null,
        first_approved_by: hostUserId,
        first_approved_in_game: gameCode,
        last_approved_by: hostUserId,
        last_approved_in_game: gameCode
      })
      .select()
      .single();

    let wordRecord: unknown;
    let isNewWord = false;

    if (!insertError && inserted) {
      wordRecord = inserted;
      isNewWord = true;
    } else if (insertError && insertError.code === '23505') {
      // Word already exists - fetch and update
      const { data: existing, error: fetchError } = await client
        .from('community_words')
        .select('id, approval_count, promoted_to_dictionary')
        .eq('word', word)
        .eq('language', language)
        .single();

      if (fetchError || !existing) {
        logger.error('SUPABASE', `Error fetching existing word "${word}"`, fetchError?.message);
        return { data: null, error: fetchError || { message: 'Word not found after conflict' }, isNewWord: false };
      }

      const updates: Record<string, unknown> = {
        approval_count: existing.approval_count + 1,
        last_approved_by: hostUserId,
        last_approved_in_game: gameCode,
        last_approved_at: now
      };

      if (promoted && !existing.promoted_to_dictionary) {
        updates.promoted_to_dictionary = true;
        updates.promoted_at = now;
      }

      const { data: updated, error: updateError } = await client
        .from('community_words')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error('SUPABASE', `Error updating word "${word}"`, updateError.message);
        return { data: null, error: updateError, isNewWord: false };
      }

      wordRecord = updated;
    } else {
      // Real insert error (not a conflict)
      logger.error('SUPABASE', `Error inserting word "${word}"`, insertError?.message);
      return { data: null, error: insertError, isNewWord: false };
    }

    // Record the individual approval event
    if (wordRecord) {
      const wordData = wordRecord as { id: string };
      const { error: approvalError } = await client
        .from('community_word_approvals')
        .insert({
          word_id: wordData.id,
          approved_by: hostUserId,
          game_code: gameCode
        });

      if (approvalError) {
        logger.warn('SUPABASE', `Error recording approval for "${word}"`, approvalError.message);
      }
    }

    const wordData = wordRecord as { approval_count?: number } | null;
    logger.debug('SUPABASE', `${isNewWord ? 'Saved new' : 'Updated'} community word "${word}" (${language}) - approval count: ${wordData?.approval_count || 1}${promoted ? ' - PROMOTED' : ''}`);
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
    const now = new Date().toISOString();

    // Try insert first. If the word already exists, the unique constraint
    // on (word, language) returns an error (code 23505) instead of the old
    // SELECT-then-INSERT race that caused duplicate key violations.
    const { data: inserted, error: insertError } = await client
      .from('player_words')
      .insert({
        word: normalizedWord,
        language,
        times_submitted: 1,
        first_submitted_by: playerId,
        first_submitted_in_game: gameCode,
        last_submitted_by: playerId,
        last_submitted_in_game: gameCode,
        last_submitted_at: now
      })
      .select()
      .single();

    if (!insertError && inserted) {
      logger.debug('SUPABASE', `Saved new player word "${normalizedWord}" (${language}) - times submitted: 1`);
      return { data: inserted, error: null, isNewWord: true };
    }

    // If error is NOT a unique constraint violation, it's a real error
    if (insertError && insertError.code !== '23505') {
      logger.error('SUPABASE', `Error inserting player word "${normalizedWord}"`, insertError.message);
      return { data: null, error: insertError, isNewWord: false };
    }

    // Word already exists - fetch current row and increment times_submitted
    const { data: existing, error: fetchError } = await client
      .from('player_words')
      .select('id, times_submitted')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    if (fetchError || !existing) {
      logger.error('SUPABASE', `Error fetching existing player word "${normalizedWord}"`, fetchError?.message);
      return { data: null, error: fetchError || { message: 'Word not found after conflict' }, isNewWord: false };
    }

    const { data: updated, error: updateError } = await client
      .from('player_words')
      .update({
        times_submitted: existing.times_submitted + 1,
        last_submitted_by: playerId,
        last_submitted_in_game: gameCode,
        last_submitted_at: now
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      logger.error('SUPABASE', `Error updating player word "${normalizedWord}"`, updateError.message);
      return { data: null, error: updateError, isNewWord: false };
    }

    const wordData = updated as { times_submitted?: number } | null;
    logger.debug('SUPABASE', `Updated player word "${normalizedWord}" (${language}) - times submitted: ${wordData?.times_submitted || 1}`);
    return { data: updated, error: null, isNewWord: false };

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
