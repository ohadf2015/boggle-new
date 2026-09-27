/**
 * Word Bank Admin Operations
 *
 * Administrative functions for managing the daily challenge word bank:
 * seeding, import, validation status, statistics, and CRUD operations.
 *
 * @module lib/dailyChallenge/wordBankAdmin
 */

import type { Language } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { WORD_LENGTH_RANGE, STATIC_WORD_LISTS, type ValidationStatus } from './wordBankData';
import { addToCommunityWords } from './wordBankBulk';

import logger from '@/backend/utils/logger';

// Re-export bulk operations for consumers importing from wordBankAdmin
export {
  bulkUpdateValidationStatus,
  bulkImportWords,
} from './wordBankBulk';

/**
 * Seed the word bank with static words
 */
export async function seedWordBank(
  supabase: SupabaseClient,
  language: Language
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const wordList = STATIC_WORD_LISTS[language] || [];
  const lengthRange = WORD_LENGTH_RANGE[language];

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const word of wordList) {
    const normalizedWord = word.toUpperCase();
    if (normalizedWord.length < lengthRange.min || normalizedWord.length > lengthRange.max) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert(
        { word: normalizedWord, language, source: 'static', status: 'active' },
        { onConflict: 'word,language', ignoreDuplicates: true }
      );

    if (error) {
      if (error.code === '23505') skipped++;
      else { logger.error('WORD_BANK', `Error inserting word: ${normalizedWord}`, { error }); errors++; }
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Add words to the word bank from dictionary
 */
export async function importWordsFromDictionary(
  supabase: SupabaseClient,
  language: Language,
  words: string[],
  source: 'dictionary' | 'wikipedia' | 'admin' = 'dictionary',
  validationStatus: ValidationStatus = 'approved'
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const lengthRange = WORD_LENGTH_RANGE[language];
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const word of words) {
    const normalizedWord = word.toUpperCase();
    if (normalizedWord.length < lengthRange.min || normalizedWord.length > lengthRange.max) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert(
        { word: normalizedWord, language, source, status: 'active', validation_status: validationStatus },
        { onConflict: 'word,language', ignoreDuplicates: true }
      );

    if (error) {
      if (error.code === '23505') skipped++;
      else { logger.error('WORD_BANK', `Error importing word: ${normalizedWord}`, { error }); errors++; }
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Import Wikipedia words to the word bank with automatic length filtering
 */
export async function importWikipediaWordsToBank(
  supabase: SupabaseClient,
  language: Language,
  words: string[],
  options?: {
    validationStatus?: ValidationStatus;
    sourceArticleTitle?: string;
    sourceArticleUrl?: string;
    interestingnessScore?: number;
  }
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const lengthRange = WORD_LENGTH_RANGE[language];
  const validWords = words.filter(word => {
    const n = word.toUpperCase();
    return n.length >= lengthRange.min && n.length <= lengthRange.max;
  });

  logger.info(
    'WORD_BANK',
    `Importing ${validWords.length}/${words.length} Wikipedia words for ${language} (filtered by length ${lengthRange.min}-${lengthRange.max})`
  );

  return importWordsFromDictionary(supabase, language, validWords, 'wikipedia', options?.validationStatus ?? 'pending');
}

/**
 * Import a single Wikipedia word with full metadata
 */
export async function importWikipediaWordWithMetadata(
  supabase: SupabaseClient,
  language: Language,
  word: string,
  metadata: {
    sourceArticleTitle: string;
    sourceArticleUrl: string;
    interestingnessScore?: number;
    validationStatus?: ValidationStatus;
  }
): Promise<boolean> {
  const lengthRange = WORD_LENGTH_RANGE[language];
  const normalizedWord = word.toUpperCase();

  if (normalizedWord.length < lengthRange.min || normalizedWord.length > lengthRange.max) return false;

  const { error } = await supabase
    .from('daily_challenge_word_bank')
    .upsert(
      {
        word: normalizedWord, language, source: 'wikipedia', status: 'active',
        validation_status: metadata.validationStatus ?? 'pending',
        source_article_title: metadata.sourceArticleTitle,
        source_article_url: metadata.sourceArticleUrl,
        interestingness_score: metadata.interestingnessScore ?? null,
        fetch_date: new Date().toISOString().split('T')[0],
      },
      { onConflict: 'word,language', ignoreDuplicates: false }
    );

  if (error) { logger.error('WORD_BANK', `Error importing Wikipedia word: ${normalizedWord}`, { error }); return false; }
  return true;
}

/**
 * Block a word from being used in daily challenges
 */
export async function blockWord(
  supabase: SupabaseClient, word: string, language: Language, adminId: string, reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('block_word_bank_word', {
    p_word: word.toUpperCase(), p_language: language, p_admin_id: adminId, p_reason: reason || null,
  });
  if (error) { logger.error('WORD_BANK', 'Error blocking word:', error); return false; }
  return data === true;
}

/**
 * Unblock a previously blocked word
 */
export async function unblockWord(
  supabase: SupabaseClient, word: string, language: Language
): Promise<boolean> {
  const { data, error } = await supabase.rpc('unblock_word_bank_word', {
    p_word: word.toUpperCase(), p_language: language,
  });
  if (error) { logger.error('WORD_BANK', 'Error unblocking word:', error); return false; }
  return data === true;
}

/**
 * Mark a word as used (updates usage tracking)
 */
export async function markWordAsUsed(
  supabase: SupabaseClient, word: string, language: Language
): Promise<void> {
  const { error } = await supabase.rpc('mark_word_bank_used', {
    p_word: word.toUpperCase(), p_language: language,
  });
  if (error) logger.error('WORD_BANK', 'Error marking word as used:', error);
}

/**
 * Get word bank statistics
 */
export async function getWordBankStats(
  supabase: SupabaseClient, language: Language
): Promise<{
  total: number; active: number; blocked: number;
  bySource: Record<string, number>; pending: number; approved: number; rejected: number;
}> {
  const { data, error } = await supabase
    .from('daily_challenge_word_bank')
    .select('status, source, validation_status')
    .eq('language', language);

  if (error) {
    logger.error('WORD_BANK', 'Error fetching word bank stats:', error);
    return { total: 0, active: 0, blocked: 0, bySource: {}, pending: 0, approved: 0, rejected: 0 };
  }

  const stats = {
    total: data.length,
    active: data.filter(w => w.status === 'active').length,
    blocked: data.filter(w => w.status === 'blocked').length,
    bySource: {} as Record<string, number>,
    pending: data.filter(w => w.validation_status === 'pending').length,
    approved: data.filter(w => w.validation_status === 'approved').length,
    rejected: data.filter(w => w.validation_status === 'rejected').length,
  };

  for (const word of data) {
    stats.bySource[word.source] = (stats.bySource[word.source] || 0) + 1;
  }
  return stats;
}

/**
 * Get all words in the word bank (for admin management)
 */
export async function getWordBankWords(
  supabase: SupabaseClient,
  language: Language,
  options: {
    status?: 'active' | 'blocked' | 'used';
    validation_status?: ValidationStatus;
    source?: string;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}
): Promise<{
  words: Array<{
    id: string; word: string; language: string; source: string; status: string;
    validation_status: ValidationStatus; times_used: number; last_used_at: string | null;
    blocked_reason: string | null; created_at: string;
    source_article_title: string | null; source_article_url: string | null;
    interestingness_score: number | null; fetch_date: string | null;
  }>;
  total: number;
}> {
  let query = supabase
    .from('daily_challenge_word_bank')
    .select('*', { count: 'exact' })
    .eq('language', language)
    .order('created_at', { ascending: false });

  if (options.status) query = query.eq('status', options.status);
  if (options.validation_status) query = query.eq('validation_status', options.validation_status);
  if (options.source) query = query.eq('source', options.source);
  if (options.search) query = query.ilike('word', `%${options.search}%`);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  const { data, error, count } = await query;
  if (error) { logger.error('WORD_BANK', 'Error fetching word bank words:', error); return { words: [], total: 0 }; }
  return { words: data || [], total: count || 0 };
}

/**
 * Delete a word from the word bank permanently
 */
export async function deleteWordFromBank(
  supabase: SupabaseClient, word: string, language: Language
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_challenge_word_bank')
    .delete()
    .eq('word', word.toUpperCase())
    .eq('language', language);
  if (error) { logger.error('WORD_BANK', 'Error deleting word:', error); return false; }
  return true;
}

/**
 * Update validation status for a single word
 */
export async function updateValidationStatus(
  supabase: SupabaseClient, wordId: string, validationStatus: ValidationStatus
): Promise<boolean> {
  if (validationStatus === 'approved') {
    const { data: wordData, error: fetchError } = await supabase
      .from('daily_challenge_word_bank')
      .select('word, language')
      .eq('id', wordId)
      .single();

    if (fetchError || !wordData) {
      logger.error('WORD_BANK', 'Error fetching word for approval:', fetchError);
      return false;
    }

    const { error: updateError } = await supabase
      .from('daily_challenge_word_bank')
      .update({ validation_status: validationStatus })
      .eq('id', wordId);

    if (updateError) { logger.error('WORD_BANK', 'Error updating validation status:', updateError); return false; }
    await addToCommunityWords(supabase, wordData.word, wordData.language);
    return true;
  }

  const { error } = await supabase
    .from('daily_challenge_word_bank')
    .update({ validation_status: validationStatus })
    .eq('id', wordId);

  if (error) { logger.error('WORD_BANK', 'Error updating validation status:', error); return false; }
  return true;
}

/**
 * Get words pending review
 */
export async function getPendingWords(
  supabase: SupabaseClient, language: Language, limit: number = 50
): Promise<Array<{
  id: string; word: string; source: string;
  source_article_title: string | null; source_article_url: string | null;
  interestingness_score: number | null; created_at: string;
}>> {
  const { data, error } = await supabase
    .from('daily_challenge_word_bank')
    .select('id, word, source, source_article_title, source_article_url, interestingness_score, created_at')
    .eq('language', language)
    .eq('validation_status', 'pending')
    .order('interestingness_score', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) { logger.error('WORD_BANK', 'Error fetching pending words:', error); return []; }
  return data || [];
}

/** Approve a word */
export async function approveWord(supabase: SupabaseClient, wordId: string): Promise<boolean> {
  return updateValidationStatus(supabase, wordId, 'approved');
}

/** Reject a word */
export async function rejectWord(supabase: SupabaseClient, wordId: string): Promise<boolean> {
  return updateValidationStatus(supabase, wordId, 'rejected');
}
