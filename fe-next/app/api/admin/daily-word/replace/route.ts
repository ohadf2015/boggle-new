import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { regenerateDailyPuzzle } from '@/utils/dailyChallenge/gridGeneration.server';
import { invalidateDailyPuzzleCache } from '@/backend/redis/dailyPuzzle';
import { MAX_TARGET_WORD_LENGTH } from '@/utils/dailyChallenge/constants';
import { captureApiError } from '@/utils/sentry';
import type { Language } from '@/types';

// Minimum word length by language (must match wikipediaWordProcessor.ts)
const MIN_WORD_LENGTH: Record<Language, number> = {
  en: 4,
  he: 4,
  sv: 4,
  ja: 2, // Japanese kanji compounds are typically 2-4 characters
  es: 4,
  fr: 4,
  de: 4,
  ru: 4,
};

/**
 * POST /api/admin/daily-word/replace
 * Replace the daily word for a specific date and optionally reset all attempts
 * When the word is replaced, the stored grid is cleared and regenerated
 * Only accessible to admin users
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Parse request body
    const body = await request.json();
    const { puzzleDate, language, newWord, resetAllAttempts, regenerateBoard = true } = body;

    if (!puzzleDate || !language || !newWord) {
      return NextResponse.json(
        { error: 'puzzleDate, language, and newWord are required' },
        { status: 400 }
      );
    }

    // Validate language first (needed for min length check)
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'] as const;
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 }
      );
    }

    // Validate word format using language-specific minimum
    const formattedWord = newWord.toUpperCase().trim();
    const minLength = MIN_WORD_LENGTH[language as Language] || 4;
    // Cap admin overrides to the gameplay target length limit.
    // Japanese kanji compounds are shorter (2-4); others follow MAX_TARGET_WORD_LENGTH.
    const maxLength = language === 'ja' ? 4 : MAX_TARGET_WORD_LENGTH;

    if (formattedWord.length < minLength || formattedWord.length > maxLength) {
      return NextResponse.json(
        { error: `Word must be between ${minLength} and ${maxLength} letters for ${language}` },
        { status: 400 }
      );
    }

    // Check if entry exists for this date/language
    const { data: existing } = await supabase
      .from('daily_target_words')
      .select('id, target_word, override_word')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .single();

    let wordUpdateResult;

    if (existing) {
      // Update existing entry with override
      // Clear the stored grid since the word has changed - it will be regenerated
      const { error: updateError } = await supabase
        .from('daily_target_words')
        .update({
          override_word: formattedWord,
          override_by: authResult.user!.id,
          override_at: new Date().toISOString(),
          grid: null, // Clear stored grid - will be regenerated on next request
          grid_generated_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        logger.error('Update word error:', updateError);
        captureApiError(new Error(updateError.message), '/api/admin/daily-word/replace', {
          method: 'POST',
          statusCode: 500,
          body: { puzzleDate, language }
        });
        return NextResponse.json(
          { error: `Failed to update word: ${updateError.message}` },
          { status: 500 }
        );
      }

      wordUpdateResult = {
        action: 'updated',
        previousWord: existing.override_word || existing.target_word,
        newWord: formattedWord,
      };
    } else {
      // Create new entry (for today or future dates that don't have AI selection yet)
      const puzzleNumber = getPuzzleNumber(puzzleDate);

      const { error: insertError } = await supabase
        .from('daily_target_words')
        .insert({
          puzzle_date: puzzleDate,
          language,
          puzzle_number: puzzleNumber,
          target_word: formattedWord,
          ai_selected: false,
          ai_reason: 'Admin manual selection',
          override_word: formattedWord,
          override_by: authResult.user!.id,
          override_at: new Date().toISOString(),
          // grid will be generated on first player request
        });

      if (insertError) {
        logger.error('Insert word error:', insertError);
        captureApiError(new Error(insertError.message), '/api/admin/daily-word/replace', {
          method: 'POST',
          statusCode: 500,
          body: { puzzleDate, language }
        });
        return NextResponse.json(
          { error: `Failed to create word entry: ${insertError.message}` },
          { status: 500 }
        );
      }

      wordUpdateResult = {
        action: 'created',
        previousWord: null,
        newWord: formattedWord,
      };
    }

    // Invalidate Redis cache so players get the new word immediately
    // This must happen BEFORE board regeneration so any concurrent requests
    // fetch the new word from the database
    const cacheInvalidated = await invalidateDailyPuzzleCache(puzzleDate, language);
    logger.log(`[Admin] Cache invalidation for ${puzzleDate}/${language}: ${cacheInvalidated ? 'success' : 'skipped/failed'}`);

    // Regenerate board immediately if requested (default: true)
    let boardRegenerateResult = null;
    if (regenerateBoard) {
      try {
        const puzzle = await regenerateDailyPuzzle(puzzleDate, language as Language);
        boardRegenerateResult = {
          success: true,
          gridDimensions: {
            rows: puzzle.grid.length,
            cols: puzzle.grid[0]?.length || 0
          }
        };
      } catch (regenerateError) {
        const errorMessage = regenerateError instanceof Error ? regenerateError.message : 'Unknown error';
        logger.error('Board regeneration error:', regenerateError);
        captureApiError(
          regenerateError instanceof Error ? regenerateError : new Error('Unknown error'),
          '/api/admin/daily-word/replace',
          { method: 'POST', statusCode: 500 }
        );
        boardRegenerateResult = {
          success: false,
          error: errorMessage
        };
      }
    }

    // Optionally reset all attempts for this puzzle
    let resetResult = null;
    if (resetAllAttempts) {
      const { data: deletedAttempts, error: deleteError } = await supabase
        .from('daily_word_hunt_attempts')
        .delete()
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .select('id');

      if (deleteError) {
        resetResult = { success: false, error: deleteError.message };
      } else {
        resetResult = { success: true, deleted: deletedAttempts?.length || 0 };
      }
    }

    return NextResponse.json({
      success: true,
      word: wordUpdateResult,
      cacheInvalidated,
      boardRegenerate: boardRegenerateResult,
      reset: resetResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Replace word error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/replace',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Calculate puzzle number from date
function getPuzzleNumber(dateString: string): number {
  const DAILY_CHALLENGE_EPOCH = new Date('2025-12-30T00:00:00Z');
  const date = new Date(dateString + 'T00:00:00Z');
  const daysSinceEpoch = Math.floor((date.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceEpoch + 1;
}
