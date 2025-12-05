/**
 * Leaderboard API Routes
 * Handles /api/leaderboard/* endpoints
 */

const express = require('express');
const router = express.Router();
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
const { getCachedLeaderboardTop100, cacheLeaderboardTop100, getCachedUserRank, cacheUserRank } = require('../redisClient');
const logger = require('../utils/logger');

/**
 * GET /api/leaderboard
 * Get top 100 leaderboard
 */
router.get('/', async (_req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Leaderboard service not available' });
    }

    // Try cache first
    const cached = await getCachedLeaderboardTop100();
    if (cached) {
      return res.json({ data: cached, cached: true });
    }

    // Fetch from Supabase
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('leaderboard')
      .select('player_id, username, avatar_emoji, avatar_color, total_score, games_played, games_won, ranked_mmr')
      .order('total_score', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('API', `Leaderboard fetch error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Cache the result
    if (data) {
      await cacheLeaderboardTop100(data);
    }

    res.json({ data: data || [], cached: false });
  } catch (error) {
    logger.error('API', `Leaderboard error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboard/rank/:userId
 * Get a specific user's rank
 */
router.get('/rank/:userId', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Leaderboard service not available' });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Try cache first
    const cached = await getCachedUserRank(userId);
    if (cached) {
      return res.json({ data: cached, cached: true });
    }

    // Fetch from Supabase
    const supabase = getSupabase();

    // First get the user's total score
    const { data: userData, error: userError } = await supabase
      .from('leaderboard')
      .select('player_id, username, total_score, games_played')
      .eq('player_id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found in leaderboard' });
    }

    // Count how many users have a higher score to get rank
    const { count, error: countError } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('total_score', userData.total_score);

    if (countError) {
      logger.error('API', `Rank count error: ${countError.message}`);
      return res.status(500).json({ error: 'Failed to calculate rank' });
    }

    const rankData = {
      ...userData,
      rank_position: (count || 0) + 1
    };

    // Cache the result
    await cacheUserRank(userId, rankData);

    res.json({ data: rankData, cached: false });
  } catch (error) {
    logger.error('API', `User rank error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
