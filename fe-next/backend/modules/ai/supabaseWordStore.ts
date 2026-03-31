/**
 * Supabase Word Store
 *
 * Handles word storage and retrieval from Supabase database.
 * Uses community_words and word_scores tables for validation caching.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import logger from '../../utils/logger';

/**
 * Create a Supabase client with service role key to bypass RLS for writing
 */
export function createServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.warn(
      'AI_SERVICE',
      'Supabase service role not configured. Word caching will be disabled.'
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Supabase word store for persisting validated words
 */
export class SupabaseWordStore {
  private client: SupabaseClient | null = null;

  /**
   * Initialize with a Supabase client
   */
  initialize(client: SupabaseClient | null): void {
    this.client = client;
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Check if word exists in community_words table (host/AI approved words)
   */
  async checkCommunityWords(word: string, language: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data, error } = await this.client
        .from('community_words')
        .select('id')
        .eq('word', word)
        .eq('language', language)
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.debug(
          'AI_SERVICE',
          `community_words lookup error: ${error.message}`
        );
        return false;
      }

      return data !== null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug('AI_SERVICE', `community_words check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Check if word is crowd-validated in word_scores table (net_score >= threshold)
   */
  async checkWordScores(word: string, language: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data, error } = await this.client
        .from('word_scores')
        .select('id')
        .eq('word', word)
        .eq('language', language)
        .eq('is_potentially_valid', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.debug('AI_SERVICE', `word_scores lookup error: ${error.message}`);
        return false;
      }

      return data !== null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug('AI_SERVICE', `word_scores check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Save a valid word to community_words table
   */
  async saveToCommunityWords(word: string, language: string): Promise<void> {
    if (!this.client) return;

    const now = new Date().toISOString();

    try {
      // First try to insert
      const { error: insertError } = await this.client
        .from('community_words')
        .insert({
          word,
          language,
          approval_count: 1,
          first_approved_at: now,
          last_approved_at: now,
        });

      // If unique constraint violation, update timestamp
      if (insertError?.code === '23505') {
        await this.client
          .from('community_words')
          .update({ last_approved_at: now })
          .eq('word', word)
          .eq('language', language);
      } else if (insertError) {
        logger.debug(
          'AI_SERVICE',
          `Failed to insert community_words: ${insertError.message}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug('AI_SERVICE', `saveToCommunityWords failed: ${errorMessage}`);
    }
  }

  /**
   * Batch save multiple valid words to community_words table
   */
  async batchSaveToCommunityWords(
    words: string[],
    language: string
  ): Promise<void> {
    if (!this.client || words.length === 0) return;

    const now = new Date().toISOString();

    const insertData = words.map((word) => ({
      word: word.toLowerCase().trim(),
      language,
      approval_count: 1,
      first_approved_at: now,
      last_approved_at: now,
    }));

    try {
      const { error } = await this.client.from('community_words').upsert(insertData, {
        onConflict: 'word,language',
        ignoreDuplicates: false,
      });

      if (error) {
        logger.debug('AI_SERVICE', `Batch save failed: ${error.message}`);
      } else {
        logger.info(
          'AI_SERVICE',
          `Saved ${words.length} words to community_words`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug(
        'AI_SERVICE',
        `batchSaveToCommunityWords error: ${errorMessage}`
      );
    }
  }
}
