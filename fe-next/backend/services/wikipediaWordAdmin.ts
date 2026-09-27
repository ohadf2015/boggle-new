/**
 * Wikipedia Word Admin Operations
 * Admin CRUD for word candidates in the unified word bank
 */

import type { Language } from '@/shared/types/game';
import { storeWikipediaWordCandidates } from './wikipediaWordFetcher';
import logger from '../utils/logger';

/**
 * Get word candidates for admin review from UNIFIED WORD BANK
 */
export async function getWordCandidatesForAdmin(
  language: Language,
  date?: Date
): Promise<Array<{
  id: string;
  word: string;
  source: string;
  url?: string;
  score: number;
  status: string;
}>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('daily_challenge_word_bank')
      .select('id, word, source_article_title, source_article_url, interestingness_score, validation_status')
      .eq('language', language)
      .eq('source', 'wikipedia')
      .order('interestingness_score', { ascending: false, nullsFirst: false });

    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      query = query.eq('fetch_date', dateStr);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('WikiPopulator', 'Error fetching candidates for admin', { error: error.message });
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      word: d.word,
      source: d.source_article_title || 'wikipedia',
      url: d.source_article_url,
      score: d.interestingness_score || 50,
      status: d.validation_status
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', 'Error fetching candidates for admin', { error: errorMessage });
    return [];
  }
}

/**
 * Admin: Update word candidate status in UNIFIED WORD BANK
 * Mapping: 'valid' -> 'approved', 'invalid' -> 'rejected', 'pending' -> 'pending'
 */
export async function adminUpdateWordStatus(
  candidateId: string,
  status: 'valid' | 'invalid' | 'pending' | 'approved' | 'rejected'
): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const statusMap: Record<string, string> = {
      'valid': 'approved',
      'invalid': 'rejected',
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected'
    };
    const mappedStatus = statusMap[status] || status;

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .update({ validation_status: mappedStatus })
      .eq('id', candidateId);

    if (error) {
      logger.error('WikiPopulator', 'Error updating word status', { error: error.message });
      return false;
    }

    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', 'Error updating word status', { error: errorMessage });
    return false;
  }
}

/**
 * Admin: Delete word from UNIFIED WORD BANK
 */
export async function adminDeleteWordCandidate(candidateId: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .delete()
      .eq('id', candidateId);

    if (error) {
      logger.error('WikiPopulator', 'Error deleting word', { error: error.message });
      return false;
    }

    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', 'Error deleting word', { error: errorMessage });
    return false;
  }
}

/**
 * Admin: Add custom word to UNIFIED WORD BANK
 */
export async function adminAddWordCandidate(
  language: Language,
  date: Date,
  word: string,
  source: string = 'admin'
): Promise<{ success: boolean; id?: string }> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert({
        word: word.toUpperCase(),
        language,
        source: 'admin',
        status: 'active',
        validation_status: 'approved',
        source_article_title: source,
        interestingness_score: 75,
        fetch_date: dateStr
      }, {
        onConflict: 'word,language'
      })
      .select('id')
      .single();

    if (error) {
      logger.error('WikiPopulator', 'Error adding word', { error: error.message });
      return { success: false };
    }

    return { success: true, id: data?.id };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', 'Error adding word', { error: errorMessage });
    return { success: false };
  }
}

/**
 * Sync all local JSON words to database for admin panel visibility
 *
 * Languages are processed in parallel to avoid timeout.
 */
export async function syncLocalJSONToDatabase(
  language?: Language,
  loadWordsFromJSON?: (lang: Language) => Promise<Array<{ word: string; source: string; url?: string; score: number }> | null>
): Promise<{ success: boolean; results: Record<string, { synced: number; error?: string }> }> {
  const targetLanguages = language ? [language] : (['en', 'he', 'sv', 'ja', 'es', 'ru', 'fr', 'de'] as Language[]);
  const today = new Date();

  logger.info('WikiPopulator', `Starting local JSON sync for: ${targetLanguages.join(', ')} (parallel processing)`);
  const startTime = Date.now();

  const syncPromises = targetLanguages.map(async (lang) => {
    try {
      const jsonWords = loadWordsFromJSON ? await loadWordsFromJSON(lang) : null;

      if (!jsonWords || jsonWords.length === 0) {
        return { lang, synced: 0, error: 'No JSON file found or empty' };
      }

      await storeWikipediaWordCandidates(
        lang,
        today,
        jsonWords.map(w => ({
          word: w.word,
          source: `${w.source}_json_sync`,
          url: w.url,
          score: w.score
        }))
      );

      logger.info('WikiPopulator', `Synced ${jsonWords.length} words from JSON for ${lang}`);
      return { lang, synced: jsonWords.length };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WikiPopulator', `Error syncing JSON for ${lang}`, { error: errorMsg });
      return { lang, synced: 0, error: errorMsg };
    }
  });

  const settledResults = await Promise.allSettled(syncPromises);

  const results: Record<string, { synced: number; error?: string }> = {};
  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      const { lang, synced, error } = result.value;
      results[lang] = { synced, error };
    } else {
      logger.error('WikiPopulator', 'Unexpected promise rejection', { reason: result.reason });
    }
  }

  const duration = Date.now() - startTime;
  const allSuccess = Object.values(results).every(r => !r.error || r.synced > 0);

  logger.info('WikiPopulator', `JSON sync completed in ${duration}ms`, { success: allSuccess });

  return { success: allSuccess, results };
}
