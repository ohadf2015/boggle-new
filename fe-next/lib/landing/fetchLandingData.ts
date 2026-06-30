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
 *   - solveRate      — daily_word_hunt_stats solve % for language
 *
 * Not fetched here (kept client-side):
 *   - useLiveRoomStats  — WebSocket, inherently real-time
 *   - usePlayerStats    — localStorage only
 *   - useDailyChallengeStatus — requires auth cookie + localStorage
 */

import { createSupabasePublicClient } from '@/lib/supabaseServer';
import type { TopPlayer } from '@/hooks/useTopPlayers';
import { fetchGameModeStats, getCardOrder, type GameModeStats, type LandingGameMode } from './fetchGameModeStats';
import { cachedWithTtl } from '@/lib/cache/ttlCache';
import { SUPPORTED_GAME_LANGUAGES } from '@/lib/languageConfig';

export interface LandingInitialData {
  topPlayers: TopPlayer[];
  gamesToday: number;
  /** Solve rate 0-100, or null if insufficient data */
  solveRate: number | null;
  /** Per-mode play counts for popularity-based card ordering */
  gameModeStats: GameModeStats[];
  /** Pre-computed card order — derived from gameModeStats at build/ISR time */
  cardOrder: LandingGameMode[];
}

const TOP_PLAYERS_LIMIT = 5;
// Source of truth for shipped game languages — keep in lockstep so a newly
// launched locale (e.g. `ru`) gets real landing data instead of the `en` fallback.
const VALID_LANGUAGES = new Set<string>(SUPPORTED_GAME_LANGUAGES);

/**
 * Landing data is identical for every visitor of a given language and is
 * non-realtime, so we cache it per-language for a short window. This collapses
 * the 1 (season RPC) + 4 query SSR round-trip into a ~0ms memory read for all
 * but the first request per TTL — the SSR `Promise.race` timeout in page.tsx
 * then only matters on a genuine cold miss, not on every request. The DB load
 * for the homepage becomes O(languages / TTL) instead of O(requests).
 */
const LANDING_CACHE_TTL_MS = 30_000;

export async function fetchLandingData(language: string): Promise<LandingInitialData> {
  // Guard against invalid locales (e.g. crawlers hitting /sitemap.xml parsed as locale)
  if (!VALID_LANGUAGES.has(language)) {
    language = 'en';
  }
  return cachedWithTtl(
    `landing:${language}`,
    () => fetchLandingDataUncached(language),
    { ttlMs: LANDING_CACHE_TTL_MS },
  );
}

async function fetchLandingDataUncached(language: string): Promise<LandingInitialData> {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return { topPlayers: [], gamesToday: 0, solveRate: null, gameModeStats: [], cardOrder: getCardOrder() };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Resolve current season first so the leaderboard query returns the active window only.
  // Falls back to season 1 if get_current_season_id() returns NULL (no date-window match).
  const seasonResp = await supabase.rpc('get_current_season_id');
  const currentSeasonId = (seasonResp?.data as number | null) ?? 1;

  const [supabaseResults, gameModeStats] = await Promise.all([
    Promise.all([
      supabase
        .from('leaderboard')
        .select(
          'player_id, username, display_name, total_score, avatar_image, avatar_config, profiles!leaderboard_player_id_fkey(prestige_level)'
        )
        .eq('season_id', currentSeasonId)
        .gt('total_score', 0)
        .order('total_score', { ascending: false })
        .limit(TOP_PLAYERS_LIMIT),

      supabase
        .from('game_results')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),

      supabase
        .from('daily_word_hunt_stats')
        .select('solve_rate')
        .eq('puzzle_date', today)
        .eq('language', language)
        .maybeSingle(),
    ]),
    fetchGameModeStats(7),
  ]);

  const [topPlayersResult, gamesTodayResult, solveRateResult] = supabaseResults;

  // Map leaderboard rows to TopPlayer shape
  const topPlayers: TopPlayer[] = (topPlayersResult.data ?? []).map((row: any) => {
    // PostgREST embed returns either an object or array depending on cardinality
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.player_id,
      username: row.username,
      displayName: row.display_name,
      totalScore: row.total_score,
      avatarImage: row.avatar_image,
      avatarConfig: row.avatar_config,
      prestigeLevel: profile?.prestige_level ?? 0,
    };
  });

  const gamesToday = gamesTodayResult.count ?? 0;

  // Use the precomputed solve_rate from the daily_word_hunt_stats view
  const solveRate: number | null = solveRateResult.data?.solve_rate ?? null;

  return { topPlayers, gamesToday, solveRate, gameModeStats, cardOrder: getCardOrder(gameModeStats) };
}
