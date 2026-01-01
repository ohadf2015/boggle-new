import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/daily-word/attempts
 * Get all attempts for a specific daily puzzle (for admin management)
 * Query params: puzzleDate (YYYY-MM-DD), language
 */
export async function GET(request: Request) {
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
      console.error('Fetch attempts error:', error);
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
    console.error('Get attempts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
