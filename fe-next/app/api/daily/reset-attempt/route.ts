import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/daily/reset-attempt
 * Reset a player's daily word hunt attempt for today
 * Allows the player to replay the daily challenge
 *
 * This endpoint is used when the ?reset=true URL parameter is used
 * It deletes the server-side attempt record so the player can play again
 *
 * Request body:
 * - puzzleDate: string (YYYY-MM-DD format)
 * - language: string (en, he, sv, ja, es)
 * - playerId?: string (for authenticated users)
 * - guestFingerprint?: string (for guests)
 *
 * Response:
 * - success: boolean
 * - deleted: number (number of records deleted)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { puzzleDate, language, playerId, guestFingerprint } = body;

    // Validate required fields
    if (!puzzleDate || !language) {
      return NextResponse.json(
        { success: false, error: 'puzzleDate and language are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Invalid language code' },
        { status: 400 }
      );
    }

    // Must have either playerId or guestFingerprint
    if (!playerId && !guestFingerprint) {
      return NextResponse.json(
        { success: false, error: 'Either playerId or guestFingerprint is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let deleted = 0;

    if (playerId) {
      // Delete attempt for authenticated player
      const { data, error } = await supabase
        .from('daily_word_hunt_attempts')
        .delete()
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .eq('player_id', playerId)
        .select('id');

      if (error) {
        console.error('Failed to delete player attempt:', error.message);
        return NextResponse.json(
          { success: false, error: 'Failed to delete attempt' },
          { status: 500 }
        );
      }

      deleted = data?.length || 0;
      if (deleted > 0) {
        console.log(`Reset ${deleted} attempt(s) for player ${playerId} on ${puzzleDate}/${language}`);
      }
    } else if (guestFingerprint) {
      // Delete attempt for guest
      const { data, error } = await supabase
        .from('daily_word_hunt_attempts')
        .delete()
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .eq('guest_fingerprint', guestFingerprint)
        .select('id');

      if (error) {
        console.error('Failed to delete guest attempt:', error.message);
        return NextResponse.json(
          { success: false, error: 'Failed to delete attempt' },
          { status: 500 }
        );
      }

      deleted = data?.length || 0;
      if (deleted > 0) {
        console.log(`Reset ${deleted} attempt(s) for guest ${guestFingerprint.substring(0, 8)}... on ${puzzleDate}/${language}`);
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    console.error('Reset attempt error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
