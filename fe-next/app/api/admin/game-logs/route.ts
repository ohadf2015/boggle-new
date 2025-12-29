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
 * Includes both authenticated player games (from game_results) and guest games (from game_sessions)
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
    const includeGuests = searchParams.get('includeGuests') !== 'false'; // Include guests by default

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Build query for game results with player profiles (authenticated users)
    let authQuery = supabase
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

    // Apply filters to auth query
    if (language && language !== 'all') {
      authQuery = authQuery.eq('language', language);
    }

    if (isRanked !== null && isRanked !== 'all') {
      authQuery = authQuery.eq('is_ranked', isRanked === 'true');
    }

    if (startDate) {
      authQuery = authQuery.gte('created_at', startDate);
    }

    if (endDate) {
      authQuery = authQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    authQuery = authQuery.order(sortBy, { ascending });

    // Fetch authenticated games
    const { data: authData, error: authError, count: authCount } = await authQuery;

    if (authError) {
      console.error('[admin/game-logs] Auth query error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Transform authenticated games
    const authGames = (authData || []).map((game: any) => ({
      ...game,
      is_guest: false,
      mode: game.is_ranked ? 'ranked' : 'casual',
    }));

    // Fetch guest games from game_sessions if includeGuests is true
    let guestGames: any[] = [];
    let guestCount = 0;

    if (includeGuests) {
      let guestQuery = supabase
        .from('game_sessions')
        .select(`
          id,
          guest_session_id,
          mode,
          language,
          score,
          words_found,
          room_code,
          final_rank,
          duration_seconds,
          started_at,
          completed
        `, { count: 'exact' })
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true);

      // Apply filters to guest query
      if (language && language !== 'all') {
        guestQuery = guestQuery.eq('language', language);
      }

      // Guest games are never ranked
      if (isRanked === 'true') {
        // If filtering for ranked only, don't include guests
        guestGames = [];
        guestCount = 0;
      } else {
        if (startDate) {
          guestQuery = guestQuery.gte('started_at', startDate);
        }

        if (endDate) {
          guestQuery = guestQuery.lte('started_at', `${endDate}T23:59:59.999Z`);
        }

        guestQuery = guestQuery.order('started_at', { ascending });

        const { data: guestData, error: guestError, count: gCount } = await guestQuery;

        if (guestError) {
          console.error('[admin/game-logs] Guest query error:', guestError);
          // Don't fail the whole request if guest query fails
        } else {
          guestCount = gCount || 0;
          // Transform guest games to match the expected format
          guestGames = (guestData || []).map((session: any) => ({
            id: session.id,
            player_id: null,
            guest_session_id: session.guest_session_id,
            game_code: session.room_code || 'solo',
            score: session.score || 0,
            word_count: Array.isArray(session.words_found) ? session.words_found.length : 0,
            longest_word: Array.isArray(session.words_found) && session.words_found.length > 0
              ? session.words_found.reduce((longest: any, w: any) =>
                  (w.word?.length || 0) > (longest?.length || 0) ? w.word : longest, ''
                )
              : null,
            placement: session.final_rank,
            is_ranked: false,
            is_guest: true,
            mode: session.mode,
            language: session.language,
            time_played: session.duration_seconds || 0,
            created_at: session.started_at,
            profiles: null,
          }));
        }
      }
    }

    // Combine and sort all games
    const allGames = [...authGames, ...guestGames].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });

    // Calculate total count
    const totalCount = (authCount || 0) + guestCount;

    // Apply pagination to combined results
    const paginatedGames = allGames.slice(offset, offset + pageSize);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      games: paginatedGames,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      breakdown: {
        authenticatedGames: authCount || 0,
        guestGames: guestCount,
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
