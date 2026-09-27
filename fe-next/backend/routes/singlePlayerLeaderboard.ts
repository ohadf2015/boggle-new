/**
 * Single Player Leaderboard Sync API
 * Syncs guest single-player scores to the leaderboard table
 */

import express, { Request, Response, Router } from 'express';
import { getSupabase, isSupabaseConfigured } from '../modules/supabaseServer';
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

    if (!supabase) {
      logger.error('LEADERBOARD_SYNC', 'Supabase client is null despite configuration check passing');
      res.status(503).json({ error: 'Database service unavailable' });
      return;
    }

    // Check if guest already has a single-player leaderboard entry
    const { data: existing, error: fetchError } = await supabase
      .from('single_player_leaderboard')
      .select('guest_fingerprint, total_score, games_played, best_score, longest_word')
      .eq('guest_fingerprint', guestFingerprint)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for new users)
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    let updatedScore: number;
    let updatedGames: number;
    let bestScore: number;

    if (existing) {
      // Update existing entry - increment total_score and games_played
      updatedScore = existing.total_score + score;
      updatedGames = existing.games_played + 1;
      bestScore = Math.max(existing.best_score || 0, score);

      const { error: updateError } = await supabase
        .from('single_player_leaderboard')
        .update({
          total_score: updatedScore,
          games_played: updatedGames,
          best_score: bestScore,
          longest_word: longestWord || existing.longest_word,
          updated_at: new Date().toISOString(),
        })
        .eq('guest_fingerprint', guestFingerprint);

      if (updateError) {
        throw new Error(`Update error: ${updateError.message}`);
      }

      logger.info('LEADERBOARD_SYNC', `Updated guest ${guestFingerprint}: ${existing.total_score} + ${score} = ${updatedScore}`);
    } else {
      // Create new entry for guest
      updatedScore = score;
      updatedGames = 1;
      bestScore = score;

      const { error: insertError } = await supabase
        .from('single_player_leaderboard')
        .insert({
          guest_fingerprint: guestFingerprint,
          username,
          avatar_emoji: avatarEmoji,
          avatar_color: avatarColor,
          total_score: updatedScore,
          games_played: updatedGames,
          best_score: bestScore,
          longest_word: longestWord,
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
    const errorMessage = err.message || 'Unknown error';
    logger.error('LEADERBOARD_SYNC', `Failed to sync score: ${errorMessage}`, {
      stack: err.stack,
      fingerprint: req.body?.guestFingerprint
    });

    // Provide a slightly more descriptive error if it's a fetch error
    const isFetchError = errorMessage.toLowerCase().includes('fetch error');
    res.status(500).json({
      error: 'Failed to sync score to leaderboard',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      type: isFetchError ? 'database_error' : 'server_error'
    });
  }
});

/**
 * GET /api/single-player/leaderboard
 * Get top single-player scores
 */
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const supabase = getSupabase();

    if (!supabase) {
      res.status(503).json({ error: 'Database service unavailable' });
      return;
    }

    const { data: leaderboard, error } = await supabase
      .from('single_player_leaderboard')
      .select('guest_fingerprint, username, avatar_emoji, avatar_color, total_score, games_played, best_score, longest_word, updated_at')
      .gt('games_played', 0)
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Fetch error: ${error.message}`);
    }

    // Add rank position
    interface LeaderboardEntry {
      guest_fingerprint: string;
      username: string;
      avatar_emoji: string;
      avatar_color: string;
      total_score: number;
      games_played: number;
      best_score: number;
      longest_word: string | null;
      updated_at: string;
    }
    const rankedLeaderboard = (leaderboard || []).map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      count: rankedLeaderboard.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('LEADERBOARD_SYNC', `Failed to fetch leaderboard: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/single-player/stats/:fingerprint
 * Get a specific guest's stats
 */
router.get('/stats/:fingerprint', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const { fingerprint } = req.params;
    if (!fingerprint) {
      res.status(400).json({ error: 'Fingerprint is required' });
      return;
    }

    const supabase = getSupabase();

    if (!supabase) {
      res.status(503).json({ error: 'Database service unavailable' });
      return;
    }

    const { data: stats, error } = await supabase
      .from('single_player_leaderboard')
      .select('*')
      .eq('guest_fingerprint', fingerprint)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Fetch error: ${error.message}`);
    }

    if (!stats) {
      res.json({
        exists: false,
        totalScore: 0,
        gamesPlayed: 0,
        bestScore: 0,
      });
      return;
    }

    // Get rank
    const { count } = await supabase
      .from('single_player_leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('total_score', stats.total_score);

    res.json({
      exists: true,
      totalScore: stats.total_score,
      gamesPlayed: stats.games_played,
      bestScore: stats.best_score,
      longestWord: stats.longest_word,
      username: stats.username,
      avatarEmoji: stats.avatar_emoji,
      avatarColor: stats.avatar_color,
      rank: (count || 0) + 1,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('LEADERBOARD_SYNC', `Failed to fetch stats: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
