import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidPuzzleCode, calculateCustomPuzzleScore, didBeatCreator } from '@/utils/customPuzzle';

interface RouteParams {
  params: Promise<{ puzzleCode: string }>;
}

interface SubmitAttemptRequest {
  displayName: string;
  guestFingerprint?: string;
  solved: boolean;
  attemptsUsed: number;
  wordsDiscovered: number;
  lifeRemaining: number;
}

/**
 * POST /api/custom-puzzle/[puzzleCode]/submit
 * Submit an attempt for a custom puzzle
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { puzzleCode } = await params;
    const body: SubmitAttemptRequest = await request.json();
    const { displayName, guestFingerprint, solved, attemptsUsed, wordsDiscovered, lifeRemaining } = body;

    if (!isValidPuzzleCode(puzzleCode)) {
      return NextResponse.json(
        { error: 'Invalid puzzle code format' },
        { status: 400 }
      );
    }

    if (!displayName) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the puzzle to get creator's score
    const { data: puzzle, error: puzzleError } = await supabase
      .from('custom_puzzles')
      .select('id, creator_efficiency_score')
      .eq('puzzle_code', puzzleCode.toLowerCase())
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Calculate player's efficiency score
    const efficiencyScore = calculateCustomPuzzleScore(
      solved,
      attemptsUsed,
      wordsDiscovered,
      lifeRemaining
    );

    // Check if player beat the creator
    const beatCreator = didBeatCreator(efficiencyScore, puzzle.creator_efficiency_score);

    // Check for existing attempt by this player
    let existingAttemptQuery = supabase
      .from('custom_puzzle_attempts')
      .select('id')
      .eq('puzzle_id', puzzle.id);

    if (user) {
      existingAttemptQuery = existingAttemptQuery.eq('player_id', user.id);
    } else if (guestFingerprint) {
      existingAttemptQuery = existingAttemptQuery.eq('guest_fingerprint', guestFingerprint);
    }

    const { data: existingAttempt } = await existingAttemptQuery.single();

    if (existingAttempt) {
      // Update existing attempt if score is better
      const { error: updateError } = await supabase
        .from('custom_puzzle_attempts')
        .update({
          display_name: displayName,
          solved,
          attempts_used: attemptsUsed,
          efficiency_score: efficiencyScore,
          beat_creator: beatCreator,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existingAttempt.id);

      if (updateError) {
        console.error('Error updating attempt:', updateError);
        return NextResponse.json(
          { error: 'Failed to update attempt' },
          { status: 500 }
        );
      }
    } else {
      // Create new attempt
      const { error: insertError } = await supabase
        .from('custom_puzzle_attempts')
        .insert({
          puzzle_id: puzzle.id,
          player_id: user?.id || null,
          guest_fingerprint: user ? null : guestFingerprint,
          display_name: displayName,
          solved,
          attempts_used: attemptsUsed,
          efficiency_score: efficiencyScore,
          beat_creator: beatCreator,
        });

      if (insertError) {
        console.error('Error creating attempt:', insertError);
        return NextResponse.json(
          { error: 'Failed to submit attempt' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      efficiencyScore,
      beatCreator,
      creatorScore: puzzle.creator_efficiency_score,
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
