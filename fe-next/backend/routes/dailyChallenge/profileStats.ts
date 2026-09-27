/**
 * Daily Challenge Profile Stats Updater
 *
 * Shared helper for word-hunt and word-wheel submit routes. Increments
 * `total_score`, `total_games`, `last_game_at`, and — critically —
 * `unique_days_played`, which backs the DEDICATION (7 days) and
 * LOYAL_PLAYER (30 days) lifetime achievements.
 *
 * Without `unique_days_played` incrementing here, daily-challenge-only
 * players never unlock DEDICATION because the daily submit routes bypass
 * `/api/stats/record-game`.
 */

import logger from '../../utils/logger';

// Structurally compatible with the real Supabase client and with test mocks.
// We only use the fluent subset below; `unknown`-valued return types let both
// a real PostgrestFilterBuilder (thenable) and a plain Promise-returning mock
// satisfy it without TS widening to `any`.
 
type SupabaseLike = any;

export interface UpdateDailyProfileStatsArgs {
  supabase: SupabaseLike;
  playerId: string;
  scoreToAdd: number;
  now?: Date; // injectable for tests
}

/**
 * Decide if `last_game_at` falls on a different UTC day than `now`.
 * Exported for testing.
 */
export function isNewUtcDay(lastGameAt: string | null, now: Date): boolean {
  const today = now.toISOString().split('T')[0];
  if (!lastGameAt) return true;
  const lastDay = new Date(lastGameAt).toISOString().split('T')[0];
  return lastDay !== today;
}

/**
 * Increment profile stats after a daily challenge submission.
 * Fire-and-forget at the caller — errors are logged, never thrown.
 * Uses atomic RPC when available, else falls back to read-modify-write.
 */
export async function updateDailyProfileStats(args: UpdateDailyProfileStatsArgs): Promise<void> {
  const { supabase, playerId, scoreToAdd, now = new Date() } = args;

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('total_score, total_games, unique_days_played, last_game_at')
    .eq('id', playerId)
    .single();

  if (fetchError || !profile) {
    logger.error('API', `[DailyStats] Could not fetch profile for ${playerId}`);
    return;
  }

  const newDay = isNewUtcDay(profile.last_game_at, now);

  // Try atomic RPC first (handles score + games). RPC doesn't know about
  // unique_days_played, so we apply that as a follow-up update when needed.
  const { error: rpcError } = await supabase.rpc('increment_profile_stats', {
    p_user_id: playerId,
    p_score: scoreToAdd,
    p_games: 1,
  });

  const rpcMissing = rpcError && (rpcError.code === '42883' || rpcError.message?.includes('function'));

  if (rpcError && !rpcMissing) {
    logger.error('API', `[DailyStats] RPC failed for ${playerId}: ${rpcError.message}`);
    return;
  }

  const patch: Record<string, unknown> = {
    last_game_at: now.toISOString(),
  };

  if (rpcMissing) {
    patch.total_score = (profile.total_score || 0) + scoreToAdd;
    patch.total_games = (profile.total_games || 0) + 1;
  }

  if (newDay) {
    patch.unique_days_played = (profile.unique_days_played || 0) + 1;
  }

  // Skip update if nothing changed beyond last_game_at when RPC already
  // wrote stats and it's the same day (no new day, no fallback needed).
  if (!rpcMissing && !newDay) return;

  const { error: updateError } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', playerId);

  if (updateError) {
    logger.error('API', `[DailyStats] Update failed for ${playerId}: ${updateError.message}`);
  }
}
