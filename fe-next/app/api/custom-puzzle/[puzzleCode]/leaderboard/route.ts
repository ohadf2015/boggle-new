import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidPuzzleCode, rankLeaderboard, type LeaderboardEntry } from '@/utils/customPuzzle';

interface RouteParams {
  params: Promise<{ puzzleCode: string }>;
}

/**
 * GET /api/custom-puzzle/[puzzleCode]/leaderboard
 * Fetch leaderboard for a custom puzzle
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { puzzleCode } = await params;

    if (!isValidPuzzleCode(puzzleCode)) {
      return NextResponse.json(
        { error: 'Invalid puzzle code format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the puzzle with creator info
    const { data: puzzle, error: puzzleError } = await supabase
      .from('custom_puzzles')
      .select('id, creator_id, creator_guest_fingerprint, creator_display_name, creator_solved, creator_attempts_used, creator_efficiency_score, created_at')
      .eq('puzzle_code', puzzleCode.toLowerCase())
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Fetch all attempts for this puzzle
    const { data: attempts, error: attemptsError } = await supabase
      .from('custom_puzzle_attempts')
      .select('player_id, guest_fingerprint, display_name, solved, attempts_used, efficiency_score, beat_creator, completed_at')
      .eq('puzzle_id', puzzle.id)
      .order('efficiency_score', { ascending: false })
      .limit(50);

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Build leaderboard entries including creator
    const entries: Omit<LeaderboardEntry, 'rank'>[] = [
      // Creator's entry (always included, marked with crown)
      {
        displayName: puzzle.creator_display_name,
        solved: puzzle.creator_solved,
        attemptsUsed: puzzle.creator_attempts_used,
        efficiencyScore: puzzle.creator_efficiency_score,
        beatCreator: false, // Creator can't beat themselves
        isCreator: true,
        completedAt: puzzle.created_at,
      },
      // Player attempts (excluding creator if they appear in attempts)
      ...(attempts || [])
        .filter(attempt => {
          // Filter out any attempt that matches the creator's identity
          // This is a safeguard in case creator somehow got added to attempts
          return attempt.player_id !== puzzle.creator_id &&
                 attempt.guest_fingerprint !== puzzle.creator_guest_fingerprint;
        })
        .map(attempt => ({
          displayName: attempt.display_name,
          solved: attempt.solved,
          attemptsUsed: attempt.attempts_used,
          efficiencyScore: attempt.efficiency_score,
          beatCreator: attempt.beat_creator,
          isCreator: false,
          completedAt: attempt.completed_at,
        })),
    ];

    // Rank the leaderboard
    const rankedLeaderboard = rankLeaderboard(entries);

    return NextResponse.json({
      success: true,
      leaderboard: rankedLeaderboard,
      totalPlayers: rankedLeaderboard.length,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
