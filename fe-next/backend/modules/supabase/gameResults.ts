/**
 * Game Results Module
 * Recording game results to the database
 */

import { getSupabase, GameResultInput } from './client';

import logger from '../../utils/logger';

/**
 * Record a game result for a player
 */
export async function recordGameResult(result: GameResultInput): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const gameData = {
      player_id: result.playerId,
      game_code: result.gameCode,
      score: result.score,
      word_count: result.wordCount || 0,
      longest_word: result.longestWord || null,
      placement: result.placement,
      is_ranked: result.isRanked || false,
      language: result.language || 'en',
      time_played: result.timePlayed || 0,
      game_mode: result.gameMode || 'classic'
    };

    logger.info('GAME_SAVE', `Saving game to database: gameCode=${result.gameCode}, playerId=${result.playerId}, score=${result.score}, language=${result.language}`);

    const { data, error } = await client
      .from('game_results')
      .insert(gameData)
      .select()
      .single();

    if (error) {
      logger.error('SUPABASE', `Failed to record game result for ${result.playerId}`, error.message);
    } else {
      logger.info('GAME_SAVE', `✅ Game saved successfully: id=${data.id}, created_at=${data.created_at}`);
    }

    return { data, error };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error recording game result';
    logger.error('SUPABASE', 'Unexpected error recording game result', err);
    return { data: null, error: { message: errorMessage } };
  }
}

// CommonJS exports for backward compatibility
module.exports = {
  recordGameResult,
};
