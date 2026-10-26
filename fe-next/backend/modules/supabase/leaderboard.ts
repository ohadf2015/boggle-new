/**
 * Leaderboard Module
 * Leaderboard entries and ranked progress tracking
 */

import { getSupabase } from './client';

/**
 * Recompute a player's CURRENT-season leaderboard row from their dated scoring
 * events (the `recompute_current_season_leaderboard` RPC).
 *
 * The season score is a pure projection of in-window events — Word Hunt / Word
 * Wheel daily (×3, credited once per puzzle on the first submission) and
 * multiplayer games (×0.25) — so it reflects ONLY what was earned this season.
 * The previous "lifetime − archived priors" derivation dumped homeless
 * historical earnings (daily play that never reached the leaderboard table)
 * onto the new season; see migration 20260602120000_season_score_from_events.
 */
const MAX_ATTEMPTS = 3;

/** PostgREST surfaces a Postgres deadlock as SQLSTATE 40P01. */
function isDeadlockError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === '40P01' || (error.message ?? '').toLowerCase().includes('deadlock');
}

export async function updateLeaderboardEntry(playerId: string, attemptsLeft = MAX_ATTEMPTS): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  const { data, error } = await client.rpc('recompute_current_season_leaderboard', {
    p_player_id: playerId,
  });

  // Retry on deadlock (concurrent recomputes when a multiplayer round ends)
  // with jittered backoff — a single retry was not enough for a 6-player series.
  if (error && isDeadlockError(error) && attemptsLeft > 1) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 600));
    return updateLeaderboardEntry(playerId, attemptsLeft - 1);
  }

  return { data, error };
}

/**
 * Update ranked progress for a player
 */
export async function updateRankedProgress(playerId: string): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get current profile casual games count
  const { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('casual_games')
    .eq('id', playerId)
    .single();

  if (fetchError) return { data: null, error: fetchError };

  const casualGames = profile.casual_games || 0;
  const isUnlocked = casualGames >= 10;

  // Upsert ranked progress
  const { data, error } = await client
    .from('ranked_progress')
    .upsert({
      player_id: playerId,
      casual_games_played: casualGames,
      unlocked_at: isUnlocked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'player_id'
    })
    .select()
    .single();

  return { data, error };
}

