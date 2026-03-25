/**
 * Fetch game mode popularity stats by aggregating play counts across tables.
 *
 * Sources:
 *   - game_results        → multiplayer (classic, blast-mp, word-hunt)
 *   - daily_puzzle_attempts → daily challenge
 *   - adventure_level_attempts → adventure mode
 *   - blast_results        → blast mode (solo)
 *   - single_player_leaderboard → singleplayer (aggregate games_played)
 */

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export type LandingGameMode = 'singleplayer' | 'multiplayer' | 'daily' | 'adventure' | 'blast';

export interface GameModeStats {
  mode: LandingGameMode;
  playCount: number;
}

/** Returns play counts per landing-page mode for the last N days, sorted by popularity desc */
export async function fetchGameModeStats(days: number = 30): Promise<GameModeStats[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return getDefaultStats();
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    const [mpResult, dailyResult, adventureResult, blastResult, spResult] = await Promise.all([
      // Multiplayer games
      supabase
        .from('game_results')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Daily challenge attempts
      supabase
        .from('daily_puzzle_attempts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Adventure level attempts
      supabase
        .from('adventure_level_attempts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Blast solo results
      supabase
        .from('blast_results')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Singleplayer — sum of games_played (no created_at filter, it's a leaderboard)
      supabase
        .from('single_player_leaderboard')
        .select('games_played'),
    ]);

    const spTotal = (spResult.data ?? []).reduce(
      (sum: number, row: { games_played: number }) => sum + (row.games_played || 0),
      0
    );

    const stats: GameModeStats[] = [
      { mode: 'singleplayer', playCount: spTotal },
      { mode: 'multiplayer', playCount: mpResult.count ?? 0 },
      { mode: 'daily', playCount: dailyResult.count ?? 0 },
      { mode: 'adventure', playCount: adventureResult.count ?? 0 },
      { mode: 'blast', playCount: blastResult.count ?? 0 },
    ];

    // Sort by popularity descending
    stats.sort((a, b) => b.playCount - a.playCount);

    return stats;
  } catch {
    return getDefaultStats();
  }
}

/** Fallback when Supabase is unavailable — preserves default card order */
function getDefaultStats(): GameModeStats[] {
  return [
    { mode: 'singleplayer', playCount: 0 },
    { mode: 'multiplayer', playCount: 0 },
    { mode: 'daily', playCount: 0 },
    { mode: 'adventure', playCount: 0 },
    { mode: 'blast', playCount: 0 },
  ];
}
