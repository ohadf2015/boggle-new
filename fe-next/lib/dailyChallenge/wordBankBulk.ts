/**
 * Word Bank Bulk Operations
 *
 * Bulk import, validation, and community word management
 * for the daily challenge word bank.
 *
 * @module lib/dailyChallenge/wordBankBulk
 */

import type { Language } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { WORD_LENGTH_RANGE, type ValidationStatus } from './wordBankData';
import { updateValidationStatus } from './wordBankAdmin';

import logger from '@/backend/utils/logger';

/**
 * Add a word to the community_words table for game validation
 */
export async function addToCommunityWords(
  supabase: SupabaseClient,
  word: string,
  language: string
): Promise<void> {
  const now = new Date().toISOString();
  const normalizedWord = word.toLowerCase().trim();

  const { error: insertError } = await supabase
    .from('community_words')
    .insert({
      word: normalizedWord,
      language,
      approval_count: 1,
      first_approved_at: now,
      last_approved_at: now,
    });

  if (insertError?.code === '23505') {
    const { error: updateError } = await supabase
      .from('community_words')
      .update({ last_approved_at: now })
      .eq('word', normalizedWord)
      .eq('language', language);

    if (updateError) {
      logger.error('WORD_BANK', 'Error updating community_words:', updateError.message);
    } else {
      logger.info('WORD_BANK', `Updated ${normalizedWord} in community_words for ${language}`);
    }
  } else if (insertError) {
    logger.error('WORD_BANK', 'Error inserting into community_words:', insertError.message);
  } else {
    logger.info('WORD_BANK', `Added ${normalizedWord} to community_words for ${language}`);
  }
}

/**
 * Batch add words to community_words table
 */
export async function batchAddToCommunityWords(
  supabase: SupabaseClient,
  words: Array<{ word: string; language: string }>
): Promise<{ added: number; errors: number }> {
  if (words.length === 0) {
    return { added: 0, errors: 0 };
  }

  const now = new Date().toISOString();

  const batchData = words.map(({ word, language }) => ({
    word: word.toLowerCase().trim(),
    language,
    approval_count: 1,
    first_approved_at: now,
    last_approved_at: now,
  }));

  const { error } = await supabase
    .from('community_words')
    .upsert(batchData, {
      onConflict: 'word,language',
      ignoreDuplicates: false,
    });

  if (error) {
    logger.error('WORD_BANK', 'Error batch inserting into community_words:', error.message);
    return { added: 0, errors: words.length };
  }

  logger.info('WORD_BANK', `Batch added ${words.length} words to community_words`);
  return { added: words.length, errors: 0 };
}

/**
 * Bulk update validation status for multiple words
 */
export async function bulkUpdateValidationStatus(
  supabase: SupabaseClient,
  wordIds: string[],
  validationStatus: ValidationStatus
): Promise<{ success: boolean; affected: number; errors: Array<{ id: string; error: string }> }> {
  const errors: Array<{ id: string; error: string }> = [];
  let affected = 0;

  let wordsToAddToCommunity: Array<{ word: string; language: string }> = [];

  if (validationStatus === 'approved') {
    const { data: wordData, error: fetchError } = await supabase
      .from('daily_challenge_word_bank')
      .select('id, word, language')
      .in('id', wordIds);

    if (fetchError) {
      logger.error('WORD_BANK', 'Error fetching words for bulk approval:', fetchError);
    } else if (wordData) {
      wordsToAddToCommunity = wordData.map(w => ({ word: w.word, language: w.language }));
    }
  }

  const { data, error } = await supabase.rpc('bulk_update_word_bank_validation', {
    p_word_ids: wordIds,
    p_validation_status: validationStatus,
  });

  if (error) {
    logger.warn('WORD_BANK', 'Bulk update RPC failed, falling back to individual updates:', error);
    for (const id of wordIds) {
      const result = await updateValidationStatus(supabase, id, validationStatus);
      if (result) {
        affected++;
      } else {
        errors.push({ id, error: 'Failed to update' });
      }
    }
  } else {
    affected = data || wordIds.length;
    if (validationStatus === 'approved' && wordsToAddToCommunity.length > 0) {
      logger.info('WORD_BANK', `Batch adding ${wordsToAddToCommunity.length} bulk-approved words to community_words`);
      await batchAddToCommunityWords(supabase, wordsToAddToCommunity);
    }
  }

  return { success: errors.length === 0, affected, errors };
}

/**
 * Bulk import words to the word bank
 */
export async function bulkImportWords(
  supabase: SupabaseClient,
  language: Language,
  content: string,
  source: 'admin' | 'dictionary' | 'wikipedia' = 'admin',
  validationStatus: ValidationStatus = 'approved'
): Promise<{ imported: number; skipped: number; errors: number; errorDetails: Array<{ word: string; error: string }> }> {
  const lengthRange = WORD_LENGTH_RANGE[language];
  const errorDetails: Array<{ word: string; error: string }> = [];

  const lines = content.trim().split('\n').filter(line => line.trim());
  const words: string[] = [];

  for (const line of lines) {
    if (line.includes(',')) {
      const firstColumn = line.split(',')[0].trim();
      if (firstColumn) words.push(firstColumn);
    } else {
      const word = line.trim();
      if (word) words.push(word);
    }
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  const wordsToInsert = [];

  for (const word of words) {
    const normalizedWord = word.toUpperCase();

    if (normalizedWord.length < lengthRange.min || normalizedWord.length > lengthRange.max) {
      skipped++;
      errorDetails.push({ word: normalizedWord, error: `Length ${normalizedWord.length} outside range ${lengthRange.min}-${lengthRange.max}` });
      continue;
    }

    if (language !== 'ja' && !/^[A-ZÄÖÜÀÂÆÇÉÈÊËÎÏÔŒÙÛÜ\u0590-\u05FF]+$/i.test(normalizedWord)) {
      skipped++;
      errorDetails.push({ word: normalizedWord, error: 'Contains invalid characters' });
      continue;
    }

    wordsToInsert.push({
      word: normalizedWord, language, source,
      status: 'active', validation_status: validationStatus,
    });
  }

  const chunkSize = 100;
  for (let i = 0; i < wordsToInsert.length; i += chunkSize) {
    const chunk = wordsToInsert.slice(i, i + chunkSize);

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert(chunk, { onConflict: 'word,language', ignoreDuplicates: false });

    if (error) {
      logger.error('WORD_BANK', 'Error importing batch:', error);
      errors += chunk.length;
      for (const w of chunk) {
        errorDetails.push({ word: w.word, error: error.message });
      }
    } else {
      imported += chunk.length;
    }
  }

  return { imported, skipped, errors, errorDetails };
}
