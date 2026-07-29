/**
 * Player Game History Service
 *
 * Fetches recent game results for adaptive difficulty calculation
 */

import { getSupabase } from '../modules/supabase';
import type { GameResult } from './adaptiveDifficulty';

import logger from '../utils/logger';

/**
 * Fetches user's recent game results from database
 *
 * @param userId - User ID to fetch games for
 * @param limit - Maximum number of games to fetch (default: 10)
 * @returns Array of recent game results, empty array on error
 */
export async function getRecentGames(
  userId: string,
  limit: number = 10
): Promise<GameResult[]> {
  const supabase = getSupabase();

  // If Supabase not configured, return empty array (default to beginner)
  if (!supabase) {
    logger.warn('ADAPTIVE_DIFFICULTY', 'Supabase not configured, defaulting to beginner level');
    return [];
  }

  try {
    // Fetch recent game results
    const { data, error } = await supabase
      .from('game_results')
      .select('placement, score, word_count, created_at')
      .eq('player_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('ADAPTIVE_DIFFICULTY', `Failed to fetch game history for ${userId}: ${error.message}`);
      return [];
    }

    // Return empty array if no games
    if (!data || data.length === 0) {
      return [];
    }

    // Transform database results to GameResult format
    return data.map((game) => ({
      placement: game.placement,
      score: game.score,
      wordCount: game.word_count,
    }));
  } catch (err) {
    logger.error('ADAPTIVE_DIFFICULTY', `Unexpected error fetching game history: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return [];
  }
}
