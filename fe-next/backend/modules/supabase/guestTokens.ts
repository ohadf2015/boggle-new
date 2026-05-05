/**
 * Guest Tokens Module
 * Guest user token management and stats tracking
 */

import { getSupabase, GameStats } from './client';

/**
 * Get or create guest token entry
 */
export async function getOrCreateGuestToken(tokenHash: string): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Try to get existing token
  const { data: existing } = await client
    .from('guest_tokens')
    .select('id, token_hash, stats, claimed_by, created_at, updated_at')
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  // Create new token entry
  const { data, error } = await client
    .from('guest_tokens')
    .insert({
      token_hash: tokenHash,
      stats: { games: 0, score: 0, words: 0, achievementCounts: {} }
    })
    .select()
    .single();

  return { data, error };
}

interface GuestStats {
  games: number;
  score: number;
  words: number;
  timePlayed: number;
  longestWord?: string;
  achievementCounts: Record<string, number>;
}

/**
 * Update guest token stats after a game
 */
export async function updateGuestStats(tokenHash: string, gameStats: GameStats): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get current stats
  const { data: token, error: fetchError } = await client
    .from('guest_tokens')
    .select('stats')
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .maybeSingle();

  if (fetchError || !token) {
    // Token doesn't exist, create it
    return getOrCreateGuestToken(tokenHash);
  }

  const currentStats: GuestStats = token.stats || { games: 0, score: 0, words: 0, timePlayed: 0, achievementCounts: {} };

  // Update stats
  const updatedStats: GuestStats = {
    games: (currentStats.games || 0) + 1,
    score: (currentStats.score || 0) + (gameStats.score || 0),
    words: (currentStats.words || 0) + (gameStats.wordCount || 0),
    timePlayed: (currentStats.timePlayed || 0) + (gameStats.timePlayed || 0),
    longestWord: gameStats.longestWord &&
      (!currentStats.longestWord || gameStats.longestWord.length > currentStats.longestWord.length)
      ? gameStats.longestWord
      : currentStats.longestWord,
    achievementCounts: { ...currentStats.achievementCounts }
  };

  // Update achievement counts
  if (gameStats.achievements) {
    for (const achievement of gameStats.achievements) {
      updatedStats.achievementCounts[achievement] =
        (updatedStats.achievementCounts[achievement] || 0) + 1;
    }
  }

  const { data, error } = await client
    .from('guest_tokens')
    .update({ stats: updatedStats })
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .select()
    .single();

  return { data, error };
}

// CommonJS exports for backward compatibility
module.exports = {
  getOrCreateGuestToken,
  updateGuestStats,
};
