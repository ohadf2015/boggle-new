/**
 * Leaderboard Module
 * Leaderboard entries and ranked progress tracking
 */

import { getSupabase } from './client';
import { getCurrentSeasonDynamic } from '@/lib/seasons';

/**
 * Update leaderboard entry for a player
 */
export async function updateLeaderboardEntry(playerId: string, retries = 1): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get updated profile stats
  const { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('username, display_name, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, casual_wins, ranked_mmr')
    .eq('id', playerId)
    .single();

  if (fetchError) return { data: null, error: fetchError };

  const seasonId = getCurrentSeasonDynamic().id;

  // Derive season-scoped score from lifetime + prior-season snapshots so the row
  // can never regress to lifetime totals across rollovers:
  //   season_score = lifetime − Σ(prior season finals) + 10% × previous season final
  // Self-corrects on every write — bypasses any race in process_season_reset.
  const { data: priorSnapshots } = await client
    .from('season_leaderboards')
    .select('season_id, total_score')
    .eq('player_id', playerId)
    .lt('season_id', seasonId);

  const priors = priorSnapshots ?? [];
  const sumAllPriorFinals = priors.reduce((sum, row) => sum + (row.total_score ?? 0), 0);
  const previousSeasonFinal = priors.find(r => r.season_id === seasonId - 1)?.total_score ?? 0;
  const carry = Math.floor(0.10 * previousSeasonFinal);
  const lifetime = profile.total_score || 0;
  const seasonScore = Math.max(0, lifetime - sumAllPriorFinals + carry);

  // Upsert leaderboard entry — composite PK (player_id, season_id) since
  // 20260426160000_seasons_infrastructure.
  const { data, error } = await client
    .from('leaderboard')
    .upsert({
      player_id: playerId,
      season_id: seasonId,
      username: profile.username,
      display_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji,
      avatar_color: profile.avatar_color,
      total_score: seasonScore,
      games_played: profile.total_games || 0,
      games_won: (profile.casual_wins || 0) + (profile.ranked_wins || 0),
      ranked_mmr: profile.ranked_mmr || 1000,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'player_id,season_id'
    })
    .select()
    .single();

  // Retry on deadlock (concurrent upserts for same player)
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
