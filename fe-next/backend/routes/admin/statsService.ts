/**
 * Stats service: fetches dashboard stats via Supabase RPC functions.
 * Replaces 14 sequential queries with 3 parallel RPC calls.
 */

import type { StatsResponse } from './types';

const EMPTY_OVERVIEW = { totalPlayers: 0, totalGames: 0, totalWords: 0, totalGameTimeHours: 0 };
const EMPTY_ACTIVITY = { gamesToday: 0, uniquePlayersToday: 0, uniquePlayersWeek: 0, uniquePlayersMonth: 0, signupsToday: 0, signupsWeek: 0 };

interface SupabaseClient {
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Fetch all dashboard stats in 3 parallel RPC calls instead of 14 sequential queries.
 * Falls back to zeroed defaults if RPCs don't exist yet (pre-migration).
 */
export async function fetchDashboardStats(supabase: SupabaseClient): Promise<StatsResponse> {
  const [overviewResult, activityResult, languagesResult] = await Promise.all([
    supabase.rpc('admin_overview_stats'),
    supabase.rpc('admin_activity_stats'),
    supabase.rpc('admin_language_breakdown'),
  ]);

  const overview = overviewResult.error ? EMPTY_OVERVIEW : (overviewResult.data as StatsResponse['overview']);
  const activity = activityResult.error ? EMPTY_ACTIVITY : (activityResult.data as StatsResponse['activity']);
  const languages = languagesResult.error ? {} : (languagesResult.data as Record<string, number>);

  return { overview, activity, languages };
}
