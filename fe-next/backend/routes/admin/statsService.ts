/**
 * Stats service: fetches dashboard stats via Supabase RPC functions.
 * Replaces 14 sequential queries with 4 parallel RPC calls.
 */

import type { StatsResponse } from './types';

const EMPTY_OVERVIEW = { totalPlayers: 0, totalGames: 0, totalWords: 0, totalGameTimeHours: 0 };
const EMPTY_ACTIVITY = { gamesToday: 0, uniquePlayersToday: 0, uniquePlayersWeek: 0, uniquePlayersMonth: 0, signupsToday: 0, signupsWeek: 0 };

interface SupabaseClient {
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Fetch all dashboard stats in 4 parallel RPC calls instead of 14 sequential queries.
 * Falls back to zeroed defaults if RPCs don't exist yet (pre-migration); the real-games
 * count is left out instead, so the UI hides it rather than show a false zero.
 */
export async function fetchDashboardStats(supabase: SupabaseClient, timeZone = 'UTC'): Promise<StatsResponse> {
  const [overviewResult, activityResult, languagesResult, realGamesResult] = await Promise.all([
    supabase.rpc('admin_overview_stats'),
    supabase.rpc('admin_activity_stats', { p_tz: timeZone }),
    supabase.rpc('admin_language_breakdown'),
    supabase.rpc('admin_real_games_stats', { p_tz: timeZone }),
  ]);

  const overview = overviewResult.error ? EMPTY_OVERVIEW : (overviewResult.data as StatsResponse['overview']);
  const activity = activityResult.error ? EMPTY_ACTIVITY : (activityResult.data as StatsResponse['activity']);
  const languages = languagesResult.error ? {} : (languagesResult.data as Record<string, number>);
  const realGames = realGamesResult.error || !realGamesResult.data ? undefined : (realGamesResult.data as StatsResponse['realGames']);

  return { overview, activity, languages, ...(realGames ? { realGames } : {}) };
}
