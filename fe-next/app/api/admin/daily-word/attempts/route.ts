import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/admin/daily-word/attempts
 * Get all attempts for a specific daily puzzle (for admin management)
 * Query params: puzzleDate (YYYY-MM-DD), language
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const puzzleDate = searchParams.get('puzzleDate');
    const language = searchParams.get('language') || 'en';
    const search = searchParams.get('search'); // Optional: search by display name
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    if (!puzzleDate) {
      return NextResponse.json(
        { error: 'puzzleDate is required' },
        { status: 400 }
      );
    }

    // Query attempts with pagination
    let query = supabase
      .from('daily_word_hunt_attempts')
      .select(`
        id,
        puzzle_date,
        puzzle_number,
        language,
        player_id,
        guest_fingerprint,
        display_name,
        avatar_emoji,
        avatar_color,
        solved,
        attempts_used,
        target_word,
        efficiency_score,
        completed_at
      `, { count: 'exact' })
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .order('completed_at', { ascending: false });

    // If search term provided, filter by display name
    // Use prefix search when possible for better index usage
    if (search) {
      // Prefix search uses index, full wildcard requires table scan
      query = query.ilike('display_name', `${search}%`);
    }

    const { data: attempts, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('Fetch attempts error:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempts: attempts || [],
      total: count ?? attempts?.length ?? 0,
      offset,
      limit,
      puzzleDate,
      language,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Get attempts error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/attempts',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
