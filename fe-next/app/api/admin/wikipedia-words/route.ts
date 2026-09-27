/**
 * Admin API: Wikipedia Word Candidates
 * GET /api/admin/wikipedia-words?date=YYYY-MM-DD&language=en
 * POST /api/admin/wikipedia-words - Add custom word
 *
 * Returns word candidates for admin review and management
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import {
  getWordCandidatesForAdmin,
  adminAddWordCandidate,
  syncLocalJSONToDatabase
} from '@/backend/services/wikipediaWordPopulator';
import { triggerWikipediaWordPopulation } from '@/backend/services/cronScheduler';
import { createAdminClient } from '@/utils/supabase/admin';
import type { Language } from '@/shared/types/game';

// Allow 90 seconds for Wikipedia API calls + AI scoring
// Wikipedia API can be slow (30s timeout per request + retries)
// With 7 languages in parallel, some may timeout and retry
export const maxDuration = 90;

const SUPPORTED_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'ru', 'fr', 'de'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  // Auth passed — do not log user email (PII)

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const language = (searchParams.get('language') || 'en') as Language;
  const excludeExisting = searchParams.get('excludeExisting') === 'true';
  const statusFilter = searchParams.get('status'); // 'pending', 'valid', 'invalid'

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json(
      { error: `Unsupported language. Use: ${SUPPORTED_LANGUAGES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    let candidates = await getWordCandidatesForAdmin(language, new Date(date));

    // Filter by status if requested
    if (statusFilter && ['pending', 'valid', 'invalid'].includes(statusFilter)) {
      candidates = candidates.filter(c => c.status === statusFilter);
    }

    // Exclude words that already exist in community_words if requested
    if (excludeExisting && candidates.length > 0) {
      const supabase = createAdminClient()!;

      // Get all words in community_words for this language
      const { data: existingWords } = await supabase
        .from('community_words')
        .select('word')
        .eq('language', language);

      if (existingWords && existingWords.length > 0) {
        const existingSet = new Set(existingWords.map(w => w.word.toUpperCase()));
        const originalCount = candidates.length;
        candidates = candidates.filter(c => !existingSet.has(c.word.toUpperCase()));
        logger.log(`[Admin Wikipedia] Filtered out ${originalCount - candidates.length} existing words`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        language,
        candidates,
        total: candidates.length,
        filters: { excludeExisting, status: statusFilter }
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Wikipedia] Error fetching candidates:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch word candidates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  // Auth passed — do not log user email (PII)

  try {
    const body = await request.json();
    const { action, date, language, word, candidateId, status } = body;
    logger.log('[Admin Wikipedia] POST action:', action, 'language:', language, 'date:', date);

    // Validate language
    if (language && !SUPPORTED_LANGUAGES.includes(language as Language)) {
      return NextResponse.json(
        { error: `Unsupported language. Use: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    switch (action) {
      case 'add': {
        // Add custom word candidate
        if (!word || !language || !date) {
          return NextResponse.json(
            { error: 'Missing required fields: word, language, date' },
            { status: 400 }
          );
        }

        const result = await adminAddWordCandidate(
          language as Language,
          new Date(date),
          word,
          'admin'
        );

        if (!result.success) {
          return NextResponse.json(
            { error: 'Failed to add word candidate' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Word "${word}" added successfully`,
          id: result.id
        });
      }

      case 'populate': {
        // Trigger Wikipedia word population
        logger.log('[Admin Wikipedia] Starting population trigger...');
        const targetDate = date ? new Date(date) : new Date();
        const targetLanguage = language as Language | undefined;

        const result = await triggerWikipediaWordPopulation(targetDate, targetLanguage);

        const duration = Date.now() - startTime;
        logger.log(`[Admin Wikipedia] Population completed in ${duration}ms, success:`, result.success);

        return NextResponse.json({
          success: result.success,
          results: result.results
        });
      }

      case 'sync-json': {
        // Sync local JSON files to database
        logger.log('[Admin Wikipedia] Starting JSON sync...');
        const targetLanguage = language as Language | undefined;

        // Create Supabase client for word bank import
        const supabase = createAdminClient()!;

        const result = await syncLocalJSONToDatabase(targetLanguage);

        // After successful sync, import all valid candidates to word bank
        if (result.success) {
          const { importWikipediaWordsToBank } = await import('@/lib/dailyChallenge/wordBankService');

          // result.results is a Record, convert to entries for iteration
          for (const [lang, langResult] of Object.entries(result.results)) {
            if (!langResult.error && langResult.synced > 0) {
              try {
                // Fetch all valid candidates for this language
                const { data: validCandidates } = await supabase
                  .from('wikipedia_word_candidates')
                  .select('word')
                  .eq('language', lang)
                  .eq('validation_status', 'valid');

                if (validCandidates && validCandidates.length > 0) {
                  const words = validCandidates.map(c => c.word);
                  const importResult = await importWikipediaWordsToBank(supabase, lang as Language, words);
                  logger.log(
                    `[Admin Wikipedia] Auto-imported ${importResult.inserted} words to word bank for ${lang} (${importResult.skipped} skipped, ${importResult.errors} errors)`
                  );
                }
              } catch (importError) {
                logger.error(`[Admin Wikipedia] Word bank import failed for ${lang}:`, importError);
                // Don't fail the entire operation - sync succeeded
              }
            }
          }
        }

        const duration = Date.now() - startTime;
        logger.log(`[Admin Wikipedia] JSON sync completed in ${duration}ms, success:`, result.success);

        return NextResponse.json({
          success: result.success,
          results: result.results
        });
      }

      case 'auto-approve-existing': {
        // Automatically approve candidates that already exist in dictionary
        logger.log('[Admin Wikipedia] Starting auto-approve existing words...');
        const targetLanguage = language as Language;

        if (!targetLanguage) {
          return NextResponse.json(
            { error: 'language is required for auto-approve-existing' },
            { status: 400 }
          );
        }

        const supabase = createAdminClient()!;

        // Get all pending candidates for this language
        const { data: pendingCandidates, error: fetchError } = await supabase
          .from('wikipedia_word_candidates')
          .select('id, word')
          .eq('language', targetLanguage)
          .eq('validation_status', 'pending');

        if (fetchError) {
          logger.error('[Admin Wikipedia] Error fetching pending candidates:', fetchError);
          return NextResponse.json(
            { error: 'Failed to fetch pending candidates' },
            { status: 500 }
          );
        }

        if (!pendingCandidates || pendingCandidates.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No pending candidates to process',
            approved: 0,
            remaining: 0
          });
        }

        // Get all existing words from community_words
        const { data: existingWords } = await supabase
          .from('community_words')
          .select('word')
          .eq('language', targetLanguage);

        const existingSet = new Set(
          (existingWords || []).map(w => w.word.toUpperCase())
        );

        // Find candidates that match existing dictionary words
        const toApprove = pendingCandidates.filter(c =>
          existingSet.has(c.word.toUpperCase())
        );

        if (toApprove.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No candidates match existing dictionary words',
            approved: 0,
            remaining: pendingCandidates.length
          });
        }

        // Bulk update matching candidates to 'valid'
        const { error: updateError } = await supabase
          .from('wikipedia_word_candidates')
          .update({ validation_status: 'valid' })
          .in('id', toApprove.map(c => c.id));

        if (updateError) {
          logger.error('[Admin Wikipedia] Error updating candidates:', updateError);
          return NextResponse.json(
            { error: 'Failed to update candidate statuses' },
            { status: 500 }
          );
        }

        const duration = Date.now() - startTime;
        logger.log(`[Admin Wikipedia] Auto-approved ${toApprove.length} existing words in ${duration}ms`);

        return NextResponse.json({
          success: true,
          message: `Auto-approved ${toApprove.length} words that exist in dictionary`,
          approved: toApprove.length,
          remaining: pendingCandidates.length - toApprove.length,
          approvedWords: toApprove.slice(0, 20).map(c => c.word) // Sample of approved words
        });
      }

      case 'approve-all-pending': {
        // Approve all pending candidates (add to dictionary without AI validation)
        logger.log('[Admin Wikipedia] Approving all pending candidates...');
        const targetLanguage = language as Language;

        if (!targetLanguage) {
          return NextResponse.json(
            { error: 'language is required for approve-all-pending' },
            { status: 400 }
          );
        }

        const supabase = createAdminClient()!;

        // Get all pending candidates
        const { data: pendingCandidates, error: fetchError } = await supabase
          .from('wikipedia_word_candidates')
          .select('id, word')
          .eq('language', targetLanguage)
          .eq('validation_status', 'pending');

        if (fetchError) {
          return NextResponse.json(
            { error: 'Failed to fetch pending candidates' },
            { status: 500 }
          );
        }

        if (!pendingCandidates || pendingCandidates.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No pending candidates to approve',
            approved: 0
          });
        }

        // Get existing dictionary words
        const { data: existingWords } = await supabase
          .from('community_words')
          .select('word')
          .eq('language', targetLanguage);

        const existingSet = new Set(
          (existingWords || []).map(w => w.word.toUpperCase())
        );

        // Filter to only new words
        const newWords = pendingCandidates.filter(c =>
          !existingSet.has(c.word.toUpperCase())
        );

        // Insert new words into community_words
        if (newWords.length > 0) {
          const wordsToInsert = newWords.map(c => ({
            word: c.word.toUpperCase(),
            language: targetLanguage,
            approval_count: 1,
            first_approved_at: new Date().toISOString(),
            last_approved_at: new Date().toISOString()
          }));

          const { error: insertError } = await supabase
            .from('community_words')
            .upsert(wordsToInsert, {
              onConflict: 'word,language',
              ignoreDuplicates: true
            });

          if (insertError) {
            logger.error('[Admin Wikipedia] Error inserting words:', insertError);
          }
        }

        // Update all candidates to 'valid'
        await supabase
          .from('wikipedia_word_candidates')
          .update({ validation_status: 'valid' })
          .in('id', pendingCandidates.map(c => c.id));

        const duration = Date.now() - startTime;
        logger.log(`[Admin Wikipedia] Approved ${pendingCandidates.length} candidates (${newWords.length} new) in ${duration}ms`);

        return NextResponse.json({
          success: true,
          message: `Approved ${pendingCandidates.length} candidates`,
          approved: pendingCandidates.length,
          newWordsAdded: newWords.length,
          alreadyInDictionary: pendingCandidates.length - newWords.length
        });
      }

      case 'schedule-for-daily': {
        // Schedule approved Wikipedia words as daily challenge target words
        logger.log('[Admin Wikipedia] Scheduling words for daily challenges...');
        const targetLanguage = language as Language;
        const startDate = body.startDate; // YYYY-MM-DD format
        const limit = body.limit || 30; // Number of words to schedule
        const minWordLength = body.minWordLength || 3;
        const maxWordLength = body.maxWordLength || 8;

        if (!targetLanguage) {
          return NextResponse.json(
            { error: 'language is required for schedule-for-daily' },
            { status: 400 }
          );
        }

        if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          return NextResponse.json(
            { error: 'startDate is required in YYYY-MM-DD format' },
            { status: 400 }
          );
        }

        const supabase = createAdminClient()!;

        // Get approved Wikipedia words that meet criteria
        const { data: approvedWords, error: fetchError } = await supabase
          .from('wikipedia_word_candidates')
          .select('id, word, interestingness_score, source_article_title')
          .eq('language', targetLanguage)
          .eq('validation_status', 'valid')
          .order('interestingness_score', { ascending: false })
          .limit(limit * 3); // Fetch extra to account for filtering

        if (fetchError) {
          logger.error('[Admin Wikipedia] Error fetching approved words:', fetchError);
          return NextResponse.json(
            { error: 'Failed to fetch approved words' },
            { status: 500 }
          );
        }

        if (!approvedWords || approvedWords.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No approved Wikipedia words available to schedule',
            scheduled: 0
          });
        }

        // Filter by word length and deduplicate
        const validWords = approvedWords.filter(w => {
          const len = w.word.length;
          return len >= minWordLength && len <= maxWordLength;
        });

        // Get already scheduled words to avoid duplicates
        const { data: existingScheduled } = await supabase
          .from('daily_target_words')
          .select('target_word')
          .eq('language', targetLanguage);

        const scheduledSet = new Set(
          (existingScheduled || []).map(w => w.target_word?.toUpperCase())
        );

        // Filter out already scheduled words
        const newWords = validWords.filter(w =>
          !scheduledSet.has(w.word.toUpperCase())
        ).slice(0, limit);

        if (newWords.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'All approved words are already scheduled',
            scheduled: 0
          });
        }

        // Calculate puzzle numbers and dates
        const DAILY_CHALLENGE_EPOCH = new Date('2025-12-30T00:00:00Z');
        const scheduledEntries = newWords.map((word, index) => {
          const puzzleDate = new Date(startDate + 'T00:00:00Z');
          puzzleDate.setDate(puzzleDate.getDate() + index);
          const dateStr = puzzleDate.toISOString().split('T')[0];
          const daysSinceEpoch = Math.floor(
            (puzzleDate.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000)
          );
          const puzzleNumber = daysSinceEpoch + 1;

          return {
            puzzle_date: dateStr,
            language: targetLanguage,
            puzzle_number: puzzleNumber,
            target_word: word.word.toUpperCase(),
            ai_selected: false,
            ai_reason: `Wikipedia trending word (score: ${word.interestingness_score})`,
            word_source: 'wikipedia',
            source_article_url: word.source_article_title
          };
        });

        // Insert into daily_target_words with upsert
        const { data: inserted, error: insertError } = await supabase
          .from('daily_target_words')
          .upsert(scheduledEntries, {
            onConflict: 'puzzle_date,language',
            ignoreDuplicates: false
          })
          .select();

        if (insertError) {
          logger.error('[Admin Wikipedia] Error scheduling words:', insertError);
          return NextResponse.json(
            { error: `Failed to schedule words: ${insertError.message}` },
            { status: 500 }
          );
        }

        const duration = Date.now() - startTime;
        logger.log(`[Admin Wikipedia] Scheduled ${inserted?.length || 0} words in ${duration}ms`);

        return NextResponse.json({
          success: true,
          message: `Scheduled ${inserted?.length || 0} Wikipedia words as daily challenges`,
          scheduled: inserted?.length || 0,
          startDate,
          endDate: scheduledEntries[scheduledEntries.length - 1]?.puzzle_date,
          words: scheduledEntries.map(e => ({
            date: e.puzzle_date,
            word: e.target_word,
            puzzleNumber: e.puzzle_number
          }))
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: add, populate, sync-json, auto-approve-existing, approve-all-pending, schedule-for-daily` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Wikipedia] Error processing request:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
