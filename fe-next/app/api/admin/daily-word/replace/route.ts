import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { regenerateDailyPuzzle } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

/**
 * POST /api/admin/daily-word/replace
 * Replace the daily word for a specific date and optionally reset all attempts
 * When the word is replaced, the stored grid is cleared and regenerated
 * Only accessible to admin users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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

    // Validate word format (3-10 letters, uppercase)
    const formattedWord = newWord.toUpperCase().trim();
    if (formattedWord.length < 3 || formattedWord.length > 10) {
      return NextResponse.json(
        { error: 'Word must be between 3 and 10 letters' },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
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
          override_by: user.id,
          override_at: new Date().toISOString(),
          grid: null, // Clear stored grid - will be regenerated on next request
          grid_generated_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
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
          override_by: user.id,
          override_at: new Date().toISOString(),
          // grid will be generated on first player request
        });

      if (insertError) {
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
        console.error('Board regeneration error:', regenerateError);
        boardRegenerateResult = {
          success: false,
          error: regenerateError instanceof Error ? regenerateError.message : 'Unknown error'
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
      boardRegenerate: boardRegenerateResult,
      reset: resetResult,
    });
  } catch (error) {
    console.error('Replace word error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
