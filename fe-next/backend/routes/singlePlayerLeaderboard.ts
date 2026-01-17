/**
 * Single Player Leaderboard Sync API
 * Syncs guest single-player scores to the leaderboard table
 */

import express, { Request, Response, Router } from 'express';
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
import logger from '../utils/logger';

const router: Router = express.Router();

interface SyncScoreRequest {
  guestFingerprint: string;
  score: number;
  wordCount: number;
  longestWord?: string;
  username?: string;
  avatarEmoji?: string;
  avatarColor?: string;
}

/**
 * POST /api/single-player/sync-score
 * Sync a guest's single-player score to the leaderboard
 */
router.post('/sync-score', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const {
      guestFingerprint,
      score,
      wordCount,
      longestWord,
      username = 'Guest',
      avatarEmoji = '🎮',
      avatarColor = '#6366f1',
    }: SyncScoreRequest = req.body;

    // Validation
    if (!guestFingerprint || typeof score !== 'number' || score < 0) {
      res.status(400).json({ error: 'Invalid request: guestFingerprint and score are required' });
      return;
    }

    const supabase = getSupabase();

    // Check if guest already has a leaderboard entry
    const { data: existing, error: fetchError } = await supabase
      .from('leaderboard')
      .select('player_id, total_score, games_played')
      .eq('player_id', guestFingerprint)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for new users)
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    let updatedScore: number;
    let updatedGames: number;

    if (existing) {
      // Update existing entry - increment total_score and games_played
      updatedScore = existing.total_score + score;
      updatedGames = existing.games_played + 1;

      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({
          total_score: updatedScore,
          games_played: updatedGames,
          updated_at: new Date().toISOString(),
        })
        .eq('player_id', guestFingerprint);

      if (updateError) {
        throw new Error(`Update error: ${updateError.message}`);
      }

      logger.info('LEADERBOARD_SYNC', `Updated guest ${guestFingerprint}: ${existing.total_score} + ${score} = ${updatedScore}`);
    } else {
      // Create new entry for guest
      updatedScore = score;
      updatedGames = 1;

      const { error: insertError } = await supabase
        .from('leaderboard')
        .insert({
          player_id: guestFingerprint,
          username,
          avatar_emoji: avatarEmoji,
          avatar_color: avatarColor,
          total_score: updatedScore,
          games_played: updatedGames,
          games_won: 0,
          ranked_mmr: 0,
        });

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`);
      }

      logger.info('LEADERBOARD_SYNC', `Created guest ${guestFingerprint}: score=${updatedScore}, games=${updatedGames}`);
    }

    res.json({
      success: true,
      totalScore: updatedScore,
      gamesPlayed: updatedGames,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('LEADERBOARD_SYNC', `Failed to sync score: ${err.message}`);
    res.status(500).json({ error: 'Failed to sync score to leaderboard' });
  }
});

export default router;
