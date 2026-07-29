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
export async function updateLeaderboardEntry(playerId: string, retries = 1): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  const { data, error } = await client.rpc('recompute_current_season_leaderboard', {
    p_player_id: playerId,
  });

  // Retry on deadlock (concurrent recomputes for same player)
  if (error && error.message.includes('deadlock') && retries > 0) {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    return updateLeaderboardEntry(playerId, retries - 1);
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

// CommonJS exports for backward compatibility
module.exports = {
  updateLeaderboardEntry,
  updateRankedProgress,
};
