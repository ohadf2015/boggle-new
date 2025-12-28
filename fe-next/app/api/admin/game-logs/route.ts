/**
 * API Route: /api/admin/game-logs
 * Admin endpoint for fetching paginated game logs from game_results table
 * GET: Fetch game logs with filters and pagination
 * Only accessible to admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check if request has valid admin authorization
 */
async function isAdminRequest(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { isAdmin: false };
  }

  // Get auth token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false };
  }

  const token = authHeader.substring(7);

  // Verify token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { isAdmin: false };
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { isAdmin: false };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * GET - Fetch game logs with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const { isAdmin } = await isAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const language = searchParams.get('language');
    const isRanked = searchParams.get('isRanked');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Build query for game results with player profiles
    let query = supabase
      .from('game_results')
      .select(`
        id,
        player_id,
        game_code,
        score,
        word_count,
        longest_word,
        placement,
        is_ranked,
        language,
        time_played,
        created_at,
        profiles:player_id (
          username,
          display_name,
          avatar_emoji,
          avatar_color
        )
      `, { count: 'exact' });

    // Apply filters
    if (language && language !== 'all') {
      query = query.eq('language', language);
    }

    if (isRanked !== null && isRanked !== 'all') {
      query = query.eq('is_ranked', isRanked === 'true');
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      // Add time to include full end day
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin/game-logs] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate pagination info
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      games: data || [],
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('[admin/game-logs] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
