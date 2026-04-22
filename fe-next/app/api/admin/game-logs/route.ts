/**
 * API Route: /api/admin/game-logs
 * Admin endpoint for fetching paginated game logs from game_results table
 * GET: Fetch game logs with filters and pagination
 * Only accessible to admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

type ProfileEmbed = unknown;

interface GameResultRow {
  id: string;
  player_id: string | null;
  game_code: string | null;
  score: number | null;
  word_count: number | null;
  longest_word: string | null;
  placement: number | null;
  is_ranked: boolean | null;
  language: string | null;
  time_played: number | null;
  created_at: string;
  profiles: ProfileEmbed;
}

interface WordFoundEntry {
  word?: string;
  timestamp?: number;
}

interface GameSessionRow {
  id: string;
  guest_session_id: string | null;
  mode: string | null;
  language: string | null;
  score: number | null;
  words_found: WordFoundEntry[] | null;
  room_code: string | null;
  final_rank: number | null;
  duration_seconds: number | null;
  started_at: string;
  completed: boolean | null;
}

interface WordHuntAttemptRow {
  id: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  language: string | null;
  puzzle_number: number | null;
  solved: boolean | null;
  attempts_used: number | null;
  target_word: string | null;
  words_discovered: WordFoundEntry[] | null;
  efficiency_score: number | null;
  completed_at: string | null;
  created_at: string;
  profiles: ProfileEmbed;
}

interface DailyPuzzleAttemptRow {
  id: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  puzzle_number: number | null;
  language: string | null;
  score: number | null;
  word_count: number | null;
  time_seconds: number | null;
  longest_word: string | null;
  completed_at: string;
  profiles: ProfileEmbed;
}

interface DrillSessionRow {
  id: string;
  user_id: string | null;
  drill_type: string | null;
  level: number | null;
  score: number | null;
  duration_seconds: number | null;
  words_found: number | null;
  domain_score_earned: number | null;
  created_at: string;
  profiles: ProfileEmbed;
}

/**
 * GET - Fetch game logs with filters and pagination
 * Includes both authenticated player games (from game_results) and guest games (from game_sessions)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const language = searchParams.get('language');
    const isRanked = searchParams.get('isRanked');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ALLOWED_SORT_COLUMNS = ['created_at', 'score', 'word_count', 'placement', 'game_mode', 'language'];
    const sortBy = ALLOWED_SORT_COLUMNS.includes(searchParams.get('sortBy') ?? '') ? searchParams.get('sortBy')! : 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
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
    const authGames = ((authData as unknown as GameResultRow[]) || []).map((game) => ({
      ...game,
      is_guest: false,
      mode: game.is_ranked ? 'ranked' : 'casual',
    }));

    // Fetch guest games from game_sessions if includeGuests is true
    let guestGames: Array<Record<string, unknown>> = [];
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
          guestGames = ((guestData as unknown as GameSessionRow[]) || []).map((session) => ({
            id: session.id,
            player_id: null,
            guest_session_id: session.guest_session_id,
            game_code: session.room_code || 'solo',
            score: session.score || 0,
            word_count: Array.isArray(session.words_found) ? session.words_found.length : 0,
            longest_word: Array.isArray(session.words_found) && session.words_found.length > 0
              ? session.words_found.reduce<string>((longest, w) =>
                  (w.word?.length || 0) > (longest.length || 0) ? (w.word ?? longest) : longest, ''
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

    // Fetch Daily Word games from daily_word_hunt_attempts (Wordle-like game)
    let wordHuntGames: Array<Record<string, unknown>> = [];
    let wordHuntCount = 0;

    try {
      let wordHuntQuery = supabase
        .from('daily_word_hunt_attempts')
        .select(`
          id,
          player_id,
          guest_fingerprint,
          language,
          puzzle_number,
          solved,
          attempts_used,
          target_word,
          words_discovered,
          efficiency_score,
          completed_at,
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
        wordHuntQuery = wordHuntQuery.eq('language', language);
      }

      // Word Hunt games are never ranked
      if (isRanked === 'true') {
        wordHuntGames = [];
        wordHuntCount = 0;
      } else {
        if (startDate) {
          wordHuntQuery = wordHuntQuery.gte('created_at', startDate);
        }

        if (endDate) {
          wordHuntQuery = wordHuntQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        wordHuntQuery = wordHuntQuery.order('created_at', { ascending });

        const { data: wordHuntData, error: wordHuntError, count: whCount } = await wordHuntQuery;

        if (wordHuntError) {
          console.error('[admin/game-logs] Word Hunt query error:', wordHuntError);
        } else {
          wordHuntCount = whCount || 0;
          wordHuntGames = ((wordHuntData as unknown as WordHuntAttemptRow[]) || []).map((attempt) => {
            // Derive duration from word discovery timestamps
            let timePlayed = 0;
            if (Array.isArray(attempt.words_discovered) && attempt.words_discovered.length > 1) {
              const timestamps = attempt.words_discovered
                .map((w) => w.timestamp)
                .filter((t): t is number => typeof t === 'number');
              if (timestamps.length > 1) {
                timePlayed = Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000);
              }
            }

            return {
              id: attempt.id,
              player_id: attempt.player_id,
              guest_session_id: attempt.guest_fingerprint,
              game_code: `daily_word_${attempt.puzzle_number}`,
              score: attempt.efficiency_score || 0,
              word_count: Array.isArray(attempt.words_discovered) ? attempt.words_discovered.length : 0,
              longest_word: attempt.target_word || null,
              placement: null,
              is_ranked: false,
              is_guest: !attempt.player_id,
              mode: 'daily_word',
              solved: attempt.solved,
              attempts_used: attempt.attempts_used,
              language: attempt.language,
              time_played: timePlayed,
              created_at: attempt.created_at,
              profiles: attempt.profiles || null,
            };
          });
        }
      }
    } catch (error) {
      console.error('[admin/game-logs] Word Hunt fetch error:', error);
    }

    // Fetch Daily Challenge games from daily_puzzle_attempts (Word Hunt daily puzzles)
    let dailyChallengeGames: Array<Record<string, unknown>> = [];
    let dailyChallengeCount = 0;

    try {
      let dailyQuery = supabase
        .from('daily_puzzle_attempts')
        .select(`
          id,
          player_id,
          guest_fingerprint,
          puzzle_number,
          language,
          score,
          word_count,
          time_seconds,
          longest_word,
          completed_at,
          profiles:player_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      // Daily Challenge games are never ranked
      if (isRanked === 'true') {
        dailyChallengeGames = [];
        dailyChallengeCount = 0;
      } else {
        if (startDate) {
          dailyQuery = dailyQuery.gte('completed_at', startDate);
        }

        if (endDate) {
          dailyQuery = dailyQuery.lte('completed_at', `${endDate}T23:59:59.999Z`);
        }

        dailyQuery = dailyQuery.order('completed_at', { ascending });

        const { data: dailyData, error: dailyError, count: dcCount } = await dailyQuery;

        if (dailyError) {
          console.error('[admin/game-logs] Daily Challenge query error:', dailyError);
        } else {
          dailyChallengeCount = dcCount || 0;
          dailyChallengeGames = ((dailyData as unknown as DailyPuzzleAttemptRow[]) || []).map((attempt) => ({
            id: attempt.id,
            player_id: attempt.player_id,
            guest_session_id: attempt.guest_fingerprint,
            game_code: `daily_puzzle_${attempt.puzzle_number}`,
            score: attempt.score || 0,
            word_count: attempt.word_count || 0,
            longest_word: attempt.longest_word || null,
            placement: null,
            is_ranked: false,
            is_guest: !attempt.player_id,
            mode: 'daily_challenge',
            language: attempt.language || 'en',
            time_played: attempt.time_seconds || 0,
            created_at: attempt.completed_at,
            profiles: attempt.profiles || null,
          }));
        }
      }
    } catch (error) {
      console.error('[admin/game-logs] Daily Challenge fetch error:', error);
    }

    // Fetch Brain Training Drill sessions from drill_sessions
    let drillGames: Array<Record<string, unknown>> = [];
    let drillCount = 0;

    try {
      let drillQuery = supabase
        .from('drill_sessions')
        .select(`
          id,
          user_id,
          drill_type,
          level,
          score,
          duration_seconds,
          words_found,
          domain_score_earned,
          created_at,
          profiles:user_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      // Drills are never ranked
      if (isRanked === 'true') {
        drillGames = [];
        drillCount = 0;
      } else {
        if (startDate) {
          drillQuery = drillQuery.gte('created_at', startDate);
        }

        if (endDate) {
          drillQuery = drillQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        drillQuery = drillQuery.order('created_at', { ascending });

        const { data: drillData, error: drillError, count: dCount } = await drillQuery;

        if (drillError) {
          console.error('[admin/game-logs] Drill sessions query error:', drillError);
        } else {
          drillCount = dCount || 0;
          drillGames = ((drillData as unknown as DrillSessionRow[]) || []).map((session) => ({
            id: session.id,
            player_id: session.user_id,
            guest_session_id: null,
            game_code: `drill_${session.drill_type}_L${session.level}`,
            score: session.score || 0,
            word_count: session.words_found || 0,
            longest_word: null,
            placement: null,
            is_ranked: false,
            is_guest: false,
            mode: 'drill',
            drill_type: session.drill_type,
            drill_level: session.level,
            language: 'en',
            time_played: session.duration_seconds || 0,
            created_at: session.created_at,
            profiles: session.profiles || null,
          }));
        }
      }
    } catch (error) {
      console.error('[admin/game-logs] Drill sessions fetch error:', error);
    }

    // Combine and sort all games
    const allGames = [...authGames, ...guestGames, ...wordHuntGames, ...dailyChallengeGames, ...drillGames].sort((a, b) => {
      const dateA = new Date(String((a as { created_at?: unknown }).created_at ?? '')).getTime();
      const dateB = new Date(String((b as { created_at?: unknown }).created_at ?? '')).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });

    // Calculate total count
    const totalCount = (authCount || 0) + guestCount + wordHuntCount + dailyChallengeCount + drillCount;

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
        wordHuntGames: wordHuntCount,
        dailyChallengeGames: dailyChallengeCount,
        drillGames: drillCount,
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
