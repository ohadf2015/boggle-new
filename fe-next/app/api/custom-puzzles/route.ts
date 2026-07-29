import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/custom-puzzles
 * List recent public custom puzzles for browse/discovery.
 * Supports ?sort=newest|popular (default: newest), ?limit=N (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const supabase = await createClient();

    let query = supabase
      .from('custom_puzzles')
      .select('puzzle_code, creator_display_name, language, target_word, creator_efficiency_score, creator_solved, total_plays, created_at')
      .is('expires_at', null)  // Only non-expired (null = no expiry)
      .limit(limit);

    if (sort === 'popular') {
      query = query.order('total_plays', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: puzzles, error } = await query;

    if (error) {
      console.error('Error fetching puzzles:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch puzzles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      puzzles: (puzzles || []).map(p => ({
        puzzleCode: p.puzzle_code,
        creatorDisplayName: p.creator_display_name,
        language: p.language,
        wordLength: p.target_word?.length || 0,
        creatorScore: p.creator_efficiency_score,
        creatorSolved: p.creator_solved,
        totalPlays: p.total_plays || 0,
        createdAt: p.created_at,
      })),
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('List puzzles error:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
