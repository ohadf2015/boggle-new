import logger from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import type { Language } from '@/types';
import type { AdminUser } from '@/lib/auth/adminAuth';

const MAX_BATCH_SIZE = 100;

interface InvalidWordRecord {
  id: string;
  word: string;
  language: Language;
  submission_count: number;
  approved_at: string | null;
}

interface BulkApproveRequest {
  wordIds: string[];
  addToDictionary?: boolean;
}

interface ErrorDetail {
  wordId: string;
  word?: string;
  reason: string;
}

export interface BulkApproveResult {
  success?: boolean;
  approved?: number;
  skipped?: number;
  failed?: number;
  errors?: ErrorDetail[];
  error?: string;
  status?: number;
}

/**
 * Core business logic for bulk approval - exported for testing
 */
export async function handleBulkApprove(
  body: Partial<BulkApproveRequest>,
  adminUser: AdminUser
): Promise<BulkApproveResult> {
  const { wordIds, addToDictionary = false } = body;

  // Input validation
  if (!wordIds || !Array.isArray(wordIds)) {
    return { error: 'Missing wordIds array', status: 400 };
  }

  if (wordIds.length === 0) {
    return { error: 'No words to approve', status: 400 };
  }

  if (wordIds.length > MAX_BATCH_SIZE) {
    return { error: `Too many words. Maximum ${MAX_BATCH_SIZE} per batch.`, status: 400 };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch all words in batch
  const { data: words, error: fetchError } = await supabase
    .from('invalid_word_submissions')
    .select('id, word, language, submission_count, approved_at')
    .in('id', wordIds);

  if (fetchError) {
    logger.error('[BulkApprove] Fetch error:', fetchError.message);
    return { error: 'Failed to fetch words', status: 500 };
  }

  const wordMap = new Map<string, InvalidWordRecord>();
  (words || []).forEach((w: InvalidWordRecord) => wordMap.set(w.id, w));

  const results: BulkApproveResult = {
    success: true,
    approved: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Process each word sequentially
  for (const wordId of wordIds) {
    const word = wordMap.get(wordId);

    // Not found
    if (!word) {
      results.skipped!++;
      results.errors!.push({ wordId, reason: 'Not found' });
      continue;
    }

    // Already approved
    if (word.approved_at) {
      results.skipped!++;
      results.errors!.push({ wordId, word: word.word, reason: 'Already approved' });
      continue;
    }

    try {
      // Calculate votes based on submission count
      const votesNeeded = Math.max(10, Math.min(word.submission_count * 2, 20));

      // Add to word_scores
      const { error: scoreError } = await supabase
        .from('word_scores')
        .upsert(
          {
            word: word.word,
            language: word.language,
            likes_count: votesNeeded,
            dislikes_count: 0,
            first_submitter: 'admin_approved',
            last_voted_at: new Date().toISOString(),
          },
          { onConflict: 'word,language' }
        );

      if (scoreError) {
        results.failed!++;
        results.errors!.push({ wordId, word: word.word, reason: `Score error: ${scoreError.message}` });
        continue;
      }

      // Mark as approved
      const { error: approveError } = await supabase
        .from('invalid_word_submissions')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: adminUser.id,
        })
        .eq('id', wordId);

      if (approveError) {
        logger.warn('[BulkApprove] Failed to mark word approved:', approveError.message);
        // Continue - word is already in word_scores
      }

      // Remove from blacklist
      await supabase
        .from('bot_word_blacklist')
        .delete()
        .eq('word', word.word)
        .eq('language', word.language);

      // Optionally add to dictionary
      if (addToDictionary) {
        try {
          const dictionary = await import('@/backend/dictionary');
          await dictionary.addApprovedWord(word.word, word.language);
        } catch (dictError) {
          logger.warn(`[BulkApprove] Dictionary add failed for ${word.word}:`, (dictError as Error).message);
        }
      }

      results.approved!++;
    } catch (error) {
      const err = error as Error;
      results.failed!++;
      results.errors!.push({ wordId, word: word.word, reason: err.message });
      logger.error('[BulkApprove] Word error:', err.message);
    }
  }

  logger.log(`[BulkApprove] Complete: ${results.approved} approved, ${results.skipped} skipped, ${results.failed} failed`);

  return results;
}
