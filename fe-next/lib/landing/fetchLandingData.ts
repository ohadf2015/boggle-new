/**
 * Server-side data fetching for the landing page.
 *
 * Replaces the client-side waterfall of 7 independent useEffect fetches
 * with a single Promise.all executed during SSR — eliminating ~350ms+ of
 * post-hydration latency.
 *
 * Fetched here (non-realtime, no user auth required):
 *   - topPlayers     — leaderboard table, top N by total_score
 *   - gamesToday     — game_results count for today
 *   - solveRate      — daily_puzzle_attempts solve % for language
 *
 * Not fetched here (kept client-side):
 *   - useLiveRoomStats  — WebSocket, inherently real-time
 *   - usePlayerStats    — localStorage only
 *   - useDailyChallengeStatus — requires auth cookie + localStorage
 */

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { TopPlayer } from '@/hooks/useTopPlayers';
import { fetchGameModeStats, type GameModeStats } from './fetchGameModeStats';

export interface LandingInitialData {
  topPlayers: TopPlayer[];
  gamesToday: number;
  /** Solve rate 0-100, or null if insufficient data */
  solveRate: number | null;
  /** Per-mode play counts for popularity-based card ordering */
  gameModeStats: GameModeStats[];
}

const TOP_PLAYERS_LIMIT = 5;

export async function fetchLandingData(language: string): Promise<LandingInitialData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { topPlayers: [], gamesToday: 0, solveRate: null, gameModeStats: [] };
  }

  const today = new Date().toISOString().slice(0, 10);

  const [supabaseResults, gameModeStats] = await Promise.all([
    Promise.all([
      supabase
        .from('leaderboard')
        .select(
          'player_id, username, display_name, total_score, avatar_image, avatar_config'
        )
        .order('total_score', { ascending: false })
        .limit(TOP_PLAYERS_LIMIT),

      supabase
        .from('game_results')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),

      supabase
        .from('daily_puzzle_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('puzzle_date', today)
        .eq('language', language),
    ]),
    fetchGameModeStats(30),
  ]);

  const [topPlayersResult, gamesTodayResult, solveRateResult] = supabaseResults;

  // Map leaderboard rows to TopPlayer shape
  const topPlayers: TopPlayer[] = (topPlayersResult.data ?? []).map((row: any) => ({
    id: row.player_id,
    username: row.username,
    displayName: row.display_name,
    totalScore: row.total_score,
    avatarImage: row.avatar_image,
    avatarConfig: row.avatar_config,
  }));

  const gamesToday = gamesTodayResult.count ?? 0;

  // Classic daily puzzle has no "solved" concept — all completions count.
  // solveRate = 100 if anyone played, null otherwise.
  const attemptCount = solveRateResult.count ?? 0;
  const solveRate: number | null = attemptCount > 0 ? 100 : null;

  return { topPlayers, gamesToday, solveRate, gameModeStats };
}
