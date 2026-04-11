import { NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/daily/reset-attempt
 * Increment extra_tries on a player's daily word hunt attempt
 * Allows the player to replay the daily challenge while preserving history
 *
 * Request body:
 * - puzzleDate: string (YYYY-MM-DD format)
 * - language: string (en, he, sv, ja, es)
 * - playerId?: string (for authenticated users)
 * - guestFingerprint?: string (for guests)
 *
 * Response:
 * - success: boolean
 * - extraTries: number (new extra_tries count)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { puzzleDate, language, playerId, guestFingerprint } = body;

    if (!puzzleDate || !language) {
      return NextResponse.json(
        { success: false, error: 'puzzleDate and language are required' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Invalid language code' },
        { status: 400 }
      );
    }

    if (!playerId && !guestFingerprint) {
      return NextResponse.json(
        { success: false, error: 'Either playerId or guestFingerprint is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build query to increment extra_tries instead of deleting
    let query = supabase
      .from('daily_word_hunt_attempts')
      .select('id, extra_tries')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language);

    if (playerId) {
      query = query.eq('player_id', playerId);
    } else {
      query = query.eq('guest_fingerprint', guestFingerprint);
    }

    const { data: existing, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      logger.error('Failed to fetch attempt for reset:', fetchError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attempt' },
        { status: 500 }
      );
    }

    if (!existing) {
      // No existing record — nothing to reset, allow retry as fresh attempt
      return NextResponse.json({ success: true, extraTries: 0 });
    }

    const newExtraTries = (existing.extra_tries || 0) + 1;

    const { error: updateError } = await supabase
      .from('daily_word_hunt_attempts')
      .update({ extra_tries: newExtraTries })
      .eq('id', existing.id);

    if (updateError) {
      logger.error('Failed to increment extra_tries:', updateError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to reset attempt' },
        { status: 500 }
      );
    }

    const identifier = playerId || guestFingerprint?.substring(0, 8) + '...';
    logger.log(`Incremented extra_tries to ${newExtraTries} for ${identifier} on ${puzzleDate}/${language}`);

    return NextResponse.json({
      success: true,
      extraTries: newExtraTries,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Reset attempt error:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
