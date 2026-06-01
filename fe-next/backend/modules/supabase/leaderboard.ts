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

  // Derive season-scoped values from lifetime + prior-season snapshots so the
  // row can never regress to lifetime totals across rollovers:
  //   season_score        = lifetime_score − Σ(prior finals) + 10% × prev final
  //   season_games_played = lifetime_games − Σ(prior season games_played)
  //   season_games_won    = lifetime_wins  − Σ(prior season games_won)
  // Score gets a 10% soft carry from the previous season; counters do not
  // (process_season_reset zeroes them at rollover by design). Self-corrects
  // on every write — bypasses any race in process_season_reset.
  const { data: priorSnapshots } = await client
    .from('season_leaderboards')
    .select('season_id, total_score, games_played, games_won')
    .eq('player_id', playerId)
    .lt('season_id', seasonId);

  const priors = priorSnapshots ?? [];
  const finalBySeason = new Map<number, number>(priors.map(r => [r.season_id, r.total_score ?? 0]));
  const sumAllPriorFinals = priors.reduce((sum, row) => sum + (row.total_score ?? 0), 0);
  const sumPriorGames     = priors.reduce((sum, row) => sum + (row.games_played ?? 0), 0);
  const sumPriorWins      = priors.reduce((sum, row) => sum + (row.games_won ?? 0), 0);
  // Each archived final already bakes in that season's 10% soft carry:
  //   final_N = carry_N + real_earnings_N,  carry_N = 10% × final_(N-1)
  // `lifetime` (profiles.total_score) only ever counts REAL earnings — the
  // carry is a leaderboard-display bonus, never added to lifetime. So to
  // recover THIS season's new earnings we must subtract REAL prior earnings,
  // not the carry-inflated finals. Subtracting raw finals understates every
  // multi-season player by Σ(prior carries) and compounds each season.
  const sumPriorCarries = priors.reduce(
    (sum, row) => sum + Math.floor(0.10 * (finalBySeason.get(row.season_id - 1) ?? 0)),
    0,
  );
  const realPriorEarnings = sumAllPriorFinals - sumPriorCarries;
  const previousSeasonFinal = finalBySeason.get(seasonId - 1) ?? 0;
  const carry = Math.floor(0.10 * previousSeasonFinal);
  const lifetime      = profile.total_score || 0;
  const lifetimeGames = profile.total_games || 0;
  const lifetimeWins  = (profile.casual_wins || 0) + (profile.ranked_wins || 0);
  // season_score = this season's real new earnings + the soft carry head-start.
  // max(0, …) guards an inactive player whose prior real earnings already
  // account for all of lifetime (new-earnings 0) — they keep just the carry,
  // never a negative.
  const seasonScore       = carry + Math.max(0, lifetime - realPriorEarnings);
  const seasonGamesPlayed = Math.max(0, lifetimeGames - sumPriorGames);
  // Clamp wins ≤ games to neutralise pre-fix snapshot gaps where
  // games_won captured only ranked_wins (missing casual_wins). Without
  // this, derivation can produce >100% win-rate rows.
  const seasonGamesWon    = Math.min(seasonGamesPlayed, Math.max(0, lifetimeWins - sumPriorWins));

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
      games_played: seasonGamesPlayed,
      games_won: seasonGamesWon,
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
