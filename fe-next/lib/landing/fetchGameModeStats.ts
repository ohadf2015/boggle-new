/**
 * Fetch game mode popularity stats by aggregating play counts across tables.
 *
 * Sources:
 *   - game_results              → multiplayer (classic, blast-mp, word-hunt)
 *   - daily_word_hunt_attempts  → daily word hunt (Wordle-like)
 *   - daily_puzzle_attempts     → daily puzzle challenge (filtered by completed_at)
 *   - level_attempts            → adventure mode (filtered by last_attempt_at)
 *   - blast_results             → blast mode (solo)
 *   - single_player_leaderboard → singleplayer (aggregate games_played)
 */

import { createSupabasePublicClient } from '@/lib/supabaseServer';

export type LandingGameMode = 'practice' | 'arena' | 'daily' | 'adventure' | 'blast';

export interface GameModeStats {
  mode: LandingGameMode;
  playCount: number;
}

/** Returns play counts per landing-page mode for the last N days, sorted by popularity desc */
export async function fetchGameModeStats(days: number = 30): Promise<GameModeStats[]> {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return getDefaultStats();
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    const [mpResult, dailyWordHuntResult, dailyPuzzleResult, adventureResult, blastResult, spResult] = await Promise.all([
      // Multiplayer games
      supabase
        .from('game_results')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Daily Word Hunt attempts (Wordle-like daily)
      supabase
        .from('daily_word_hunt_attempts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Daily puzzle attempts (classic daily challenge)
      supabase
        .from('daily_puzzle_attempts')
        .select('id', { count: 'exact', head: true })
        .gte('completed_at', sinceISO),

      // Adventure level attempts
      supabase
        .from('level_attempts')
        .select('id', { count: 'exact', head: true })
        .gte('last_attempt_at', sinceISO),

      // Blast solo results
      supabase
        .from('blast_results')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceISO),

      // Singleplayer — count of leaderboard entries as proxy for popularity
      // (avoids full-table scan that fetched ALL rows to sum client-side)
      supabase
        .from('single_player_leaderboard')
        .select('id', { count: 'exact', head: true }),
    ]);

    const spTotal = spResult.count ?? 0;

    const dailyTotal = (dailyWordHuntResult.count ?? 0) + (dailyPuzzleResult.count ?? 0);

    const stats: GameModeStats[] = [
      { mode: 'practice', playCount: spTotal },
      { mode: 'arena', playCount: (mpResult.count ?? 0) + spTotal },
      { mode: 'daily', playCount: dailyTotal },
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

/** Default card order when no stats available */
const DEFAULT_ORDER: LandingGameMode[] = ['daily', 'arena', 'blast', 'practice', 'adventure'];

/** Modes pinned to the front regardless of popularity */
const PINNED_FIRST: LandingGameMode[] = ['daily', 'arena'];

/** Compute card display order from popularity stats. */
export function getCardOrder(stats?: GameModeStats[]): LandingGameMode[] {
  if (!stats || stats.length === 0) return DEFAULT_ORDER;

  const mainModes: LandingGameMode[] = stats
    .map(s => s.mode);

  const hasData = stats.some(s => s.playCount > 0);
  if (!hasData) return DEFAULT_ORDER;

  for (const mode of DEFAULT_ORDER) {
    if (!mainModes.includes(mode)) mainModes.push(mode);
  }

  const pinned = PINNED_FIRST.filter(m => mainModes.includes(m));
  const unpinned = mainModes.filter(m => !PINNED_FIRST.includes(m));

  return [...pinned, ...unpinned];
}

/** Fallback when Supabase is unavailable — preserves default card order */
function getDefaultStats(): GameModeStats[] {
  return [
    { mode: 'practice', playCount: 0 },
    { mode: 'arena', playCount: 0 },
    { mode: 'daily', playCount: 0 },
    { mode: 'adventure', playCount: 0 },
    { mode: 'blast', playCount: 0 },
  ];
}
