/**
 * Leaderboard API Routes
 * Handles /api/leaderboard/* endpoints
 *
 * Features request coalescing to prevent thundering herd problems
 * when cache expires and multiple requests hit simultaneously.
 */

const express = require('express');
const router = express.Router();
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
const { getCachedLeaderboardTop100, cacheLeaderboardTop100, getCachedUserRank, cacheUserRank } = require('../redisClient');
const { coalesce } = require('../utils/requestCoalescing');
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

    // Use request coalescing to prevent thundering herd when cache expires
    // Multiple simultaneous requests will share a single database fetch
    const result = await coalesce('leaderboard:top100', async () => {
      // Double-check cache in case another request just populated it
      const recheck = await getCachedLeaderboardTop100();
      if (recheck) {
        return { data: recheck, cached: true, coalesced: true };
      }

      // Fetch from Supabase
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('leaderboard')
        .select('player_id, username, avatar_emoji, avatar_color, total_score, games_played, games_won, ranked_mmr')
        .order('total_score', { ascending: false })
        .limit(100);

      if (error) {
        throw new Error(`Leaderboard fetch error: ${error.message}`);
      }

      // Cache the result
      if (data) {
        await cacheLeaderboardTop100(data);
      }

      return { data: data || [], cached: false };
    });

    res.json(result);
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

    // Use request coalescing per userId to prevent duplicate fetches
    const result = await coalesce(`leaderboard:rank:${userId}`, async () => {
      // Double-check cache
      const recheck = await getCachedUserRank(userId);
      if (recheck) {
        return { data: recheck, cached: true, coalesced: true };
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
        throw { status: 404, message: 'User not found in leaderboard' };
      }

      // Count how many users have a higher score to get rank
      const { count, error: countError } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('total_score', userData.total_score);

      if (countError) {
        throw new Error(`Rank count error: ${countError.message}`);
      }

      const rankData = {
        ...userData,
        rank_position: (count || 0) + 1
      };

      // Cache the result
      await cacheUserRank(userId, rankData);

      return { data: rankData, cached: false };
    });

    res.json(result);
  } catch (error) {
    // Handle custom error with status
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error('API', `User rank error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
