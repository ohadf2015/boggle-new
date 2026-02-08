import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidPuzzleCode } from '@/utils/customPuzzle';

interface RouteParams {
  params: Promise<{ puzzleCode: string }>;
}

/**
 * GET /api/custom-puzzle/[puzzleCode]/leaderboard
 * Get ranked leaderboard for a custom puzzle
 * Shows only solved attempts, ordered by efficiency score
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { puzzleCode } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100);

    if (!isValidPuzzleCode(puzzleCode)) {
      return NextResponse.json(
        { error: 'Invalid puzzle code format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const code = puzzleCode.toLowerCase();

    // Verify puzzle exists
    const { data: puzzle, error: puzzleError } = await supabase
      .from('custom_puzzles')
      .select('puzzle_code, creator_display_name, target_word, language, created_at')
      .eq('puzzle_code', code)
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Fetch leaderboard, solved count, and total attempts in parallel
    const [leaderboardResult, solvedCountResult, totalCountResult] = await Promise.all([
      supabase
        .from('custom_puzzle_leaderboard')
        .select('*')
        .eq('puzzle_code', code)
        .order('rank_position', { ascending: true })
        .limit(limit),
      supabase
        .from('custom_puzzle_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_code', code)
        .eq('solved', true),
      supabase
        .from('custom_puzzle_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_code', code),
    ]);

    const { data: leaderboardData, error: leaderboardError } = leaderboardResult;
    if (leaderboardError) {
      console.error('Custom puzzle leaderboard error:', leaderboardError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    if (solvedCountResult.error) {
      console.error('Custom puzzle count error:', solvedCountResult.error);
    }
    if (totalCountResult.error) {
      console.error('Custom puzzle total count error:', totalCountResult.error);
    }

    const totalSolved = solvedCountResult.count;
    const totalAttempts = totalCountResult.count;

    return NextResponse.json({
      success: true,
      data: leaderboardData || [],
      totalSolved: totalSolved || 0,
      totalAttempts: totalAttempts || 0,
      puzzle: {
        puzzleCode: puzzle.puzzle_code,
        creatorDisplayName: puzzle.creator_display_name,
        targetWord: puzzle.target_word,
        language: puzzle.language,
        createdAt: puzzle.created_at,
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Custom puzzle leaderboard error:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
