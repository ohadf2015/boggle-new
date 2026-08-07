import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidPuzzleCode } from '@/utils/customPuzzle';

interface RouteParams {
  params: Promise<{ puzzleCode: string }>;
}

/**
 * GET /api/custom-puzzle/[puzzleCode]
 * Fetch a custom puzzle by its code
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

    // Fetch the puzzle
    const { data: puzzle, error } = await supabase
      .from('custom_puzzles')
      .select('*')
      .eq('puzzle_code', puzzleCode.toLowerCase())
      .single();

    if (error || !puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Check if puzzle has expired
    if (puzzle.expires_at && new Date(puzzle.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This puzzle has expired' },
        { status: 410 }
      );
    }

    // NB: total_plays is deliberately NOT incremented here. GET must stay safe and
    // idempotent — this route is unauthenticated, so a mutation made it CSRF-able
    // (any third-party `<img src=".../api/custom-puzzle/CODE">` inflated the count)
    // and it also re-fired on Next/CDN prefetch. The counter now lives on the
    // rate-limited submit POST, which fires once per real, de-duplicated play.

    return NextResponse.json({
      success: true,
      puzzle: {
        id: puzzle.id,
        puzzleCode: puzzle.puzzle_code,
        creatorDisplayName: puzzle.creator_display_name,
        language: puzzle.language,
        targetWord: puzzle.target_word,
        grid: puzzle.grid,
        creatorSolved: puzzle.creator_solved,
        creatorAttemptsUsed: puzzle.creator_attempts_used,
        creatorEfficiencyScore: puzzle.creator_efficiency_score,
        totalPlays: puzzle.total_plays,
        createdAt: puzzle.created_at,
        expiresAt: puzzle.expires_at,
      },
    }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Get puzzle error:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
