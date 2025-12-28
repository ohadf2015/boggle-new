import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/daily-word/replace
 * Replace the daily word for a specific date and optionally reset all attempts
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
    const { puzzleDate, language, newWord, resetAllAttempts } = body;

    if (!puzzleDate || !language || !newWord) {
      return NextResponse.json(
        { error: 'puzzleDate, language, and newWord are required' },
        { status: 400 }
      );
    }

    // Validate word format (4 letters, uppercase)
    const formattedWord = newWord.toUpperCase().trim();
    if (formattedWord.length !== 4) {
      return NextResponse.json(
        { error: 'Word must be exactly 4 letters' },
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
      const { error: updateError } = await supabase
        .from('daily_target_words')
        .update({
          override_word: formattedWord,
          override_by: user.id,
          override_at: new Date().toISOString(),
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
  const DAILY_CHALLENGE_EPOCH = new Date('2024-01-01T00:00:00Z');
  const date = new Date(dateString + 'T00:00:00Z');
  const daysSinceEpoch = Math.floor((date.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceEpoch + 1;
}
