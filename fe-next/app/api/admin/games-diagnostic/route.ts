/**
 * API Route: /api/admin/games-diagnostic
 * Diagnostic endpoint to investigate today's games data
 * Provides detailed information about what's in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * GET - Diagnostic information about today's games
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

    // Get today's date range (UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    // Get local timezone info
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTime = now.toLocaleString('en-US', { timeZone: localTimeZone });

    interface TableDiagnostic {
      todayCount?: number;
      allTimeCount?: number;
      recentGames?: unknown[];
      error?: string;
    }
    interface Diagnostic {
      timestamp: string;
      localTime: string;
      localTimeZone: string;
      serverTimeZone: string;
      todayRange: { start: string; end: string };
      tables: Record<string, TableDiagnostic>;
      totals: { todayGames: number; allTimeGames: number };
      databaseTimeZone?: string | unknown;
      serverInfo?: { note?: string; processUptime?: number; processUptimeFormatted?: string; error?: string };
    }

    const diagnostic: Diagnostic = {
      timestamp: now.toISOString(),
      localTime,
      localTimeZone,
      serverTimeZone: process.env.TZ || 'Not set (defaults to UTC)',
      todayRange: {
        start: todayStart,
        end: todayEnd,
      },
      tables: {},
      totals: {
        todayGames: 0,
        allTimeGames: 0,
      },
    };

    // 1. Check game_results (authenticated multiplayer)
    try {
      const { count: todayCount } = await supabase
        .from('game_results')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const { count: allTimeCount } = await supabase
        .from('game_results')
        .select('*', { count: 'exact', head: true });

      const { data: recentGames } = await supabase
        .from('game_results')
        .select('id, game_code, created_at, language, is_ranked, score')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(5);

      diagnostic.tables.game_results = {
        todayCount: todayCount || 0,
        allTimeCount: allTimeCount || 0,
        recentGames: recentGames || [],
      };

      diagnostic.totals.todayGames += todayCount || 0;
      diagnostic.totals.allTimeGames += allTimeCount || 0;
    } catch (error) {
      diagnostic.tables.game_results = { error: (error as Error).message };
    }

    // 2. Check game_sessions (guest games)
    try {
      const { count: todayCount } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true)
        .gte('started_at', todayStart)
        .lte('started_at', todayEnd);

      const { count: allTimeCount } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true);

      const { data: recentGames } = await supabase
        .from('game_sessions')
        .select('id, room_code, started_at, mode, language, score')
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true)
        .gte('started_at', todayStart)
        .order('started_at', { ascending: false })
        .limit(5);

      diagnostic.tables.game_sessions = {
        todayCount: todayCount || 0,
        allTimeCount: allTimeCount || 0,
        recentGames: recentGames || [],
      };

      diagnostic.totals.todayGames += todayCount || 0;
      diagnostic.totals.allTimeGames += allTimeCount || 0;
    } catch (error) {
      diagnostic.tables.game_sessions = { error: (error as Error).message };
    }

    // 3. Check daily_word_hunt_attempts
    try {
      const { count: todayCount } = await supabase
        .from('daily_word_hunt_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const { count: allTimeCount } = await supabase
        .from('daily_word_hunt_attempts')
        .select('*', { count: 'exact', head: true });

      const { data: recentGames } = await supabase
        .from('daily_word_hunt_attempts')
        .select('id, puzzle_number, created_at, language, solved, attempts_used')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(5);

      diagnostic.tables.daily_word_hunt_attempts = {
        todayCount: todayCount || 0,
        allTimeCount: allTimeCount || 0,
        recentGames: recentGames || [],
      };

      diagnostic.totals.todayGames += todayCount || 0;
      diagnostic.totals.allTimeGames += allTimeCount || 0;
    } catch (error) {
      diagnostic.tables.daily_word_hunt_attempts = { error: (error as Error).message };
    }

    // 4. Check daily_puzzle_attempts
    try {
      const { count: todayCount } = await supabase
        .from('daily_puzzle_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('completed_at', todayStart)
        .lte('completed_at', todayEnd);

      const { count: allTimeCount } = await supabase
        .from('daily_puzzle_attempts')
        .select('*', { count: 'exact', head: true });

      const { data: recentGames } = await supabase
        .from('daily_puzzle_attempts')
        .select('id, puzzle_number, completed_at, language, score, word_count')
        .gte('completed_at', todayStart)
        .order('completed_at', { ascending: false })
        .limit(5);

      diagnostic.tables.daily_puzzle_attempts = {
        todayCount: todayCount || 0,
        allTimeCount: allTimeCount || 0,
        recentGames: recentGames || [],
      };

      diagnostic.totals.todayGames += todayCount || 0;
      diagnostic.totals.allTimeGames += allTimeCount || 0;
    } catch (error) {
      diagnostic.tables.daily_puzzle_attempts = { error: (error as Error).message };
    }

    // 5. Check drill_sessions
    try {
      const { count: todayCount } = await supabase
        .from('drill_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const { count: allTimeCount } = await supabase
        .from('drill_sessions')
        .select('*', { count: 'exact', head: true });

      const { data: recentGames } = await supabase
        .from('drill_sessions')
        .select('id, drill_type, level, created_at, score, duration_seconds')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(5);

      diagnostic.tables.drill_sessions = {
        todayCount: todayCount || 0,
        allTimeCount: allTimeCount || 0,
        recentGames: recentGames || [],
      };

      diagnostic.totals.todayGames += todayCount || 0;
      diagnostic.totals.allTimeGames += allTimeCount || 0;
    } catch (error) {
      diagnostic.tables.drill_sessions = { error: (error as Error).message };
    }

    // 6. Get database server timezone
    try {
      const { data: tzData } = await supabase.rpc('get_server_timezone').single();
      diagnostic.databaseTimeZone = tzData || 'Unable to fetch';
    } catch (error) {
      // Function might not exist, that's okay
      diagnostic.databaseTimeZone = 'RPC function not available';
    }

    // 7. Check for recent server restarts by checking uptime
    try {
      // Get earliest game today vs server start time
      diagnostic.serverInfo = {
        note: 'Server restart info would need to be tracked separately',
        processUptime: process.uptime(),
        processUptimeFormatted: formatUptime(process.uptime()),
      };
    } catch (error) {
      diagnostic.serverInfo = { error: (error as Error).message };
    }

    return NextResponse.json({
      success: true,
      diagnostic,
      interpretation: {
        message: diagnostic.totals.todayGames > 0
          ? `✅ Found ${diagnostic.totals.todayGames} games today. Data is being saved correctly.`
          : '⚠️ No games found today. This could mean:\n1. No one has played yet today\n2. Server timezone mismatch (check serverTimeZone vs databaseTimeZone)\n3. Games are being saved with different timestamps',
        recommendations: [
          diagnostic.totals.todayGames === 0 ? 'Play a test game and check if it appears here' : null,
          diagnostic.serverTimeZone !== diagnostic.databaseTimeZone ? '⚠️ Server and database timezones differ - this can cause date filtering issues' : null,
          'Check recentGames in each table to see actual timestamps',
        ].filter(Boolean),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[admin/games-diagnostic] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/games-diagnostic',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}
