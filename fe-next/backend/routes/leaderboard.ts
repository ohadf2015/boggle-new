/**
 * Leaderboard API Routes
 * Handles /api/leaderboard/* endpoints
 *
 * Features request coalescing to prevent thundering herd problems
 * when cache expires and multiple requests hit simultaneously.
 */

import express, { Request, Response, Router } from 'express';
 
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
 
const { getCachedLeaderboardTop100, cacheLeaderboardTop100, getCachedUserRank, cacheUserRank } = require('../redisClient');
 
const { coalesce } = require('../utils/requestCoalescing');
import logger from '../utils/logger';

const router: Router = express.Router();

interface LeaderboardEntry {
  player_id: string;
  username: string;
  display_name?: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string;
  profile_picture_url?: string;
  total_score: number;
  games_played: number;
  games_won: number;
  ranked_mmr: number;
}

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  cached: boolean;
  coalesced?: boolean;
}

interface UserRankData {
  player_id: string;
  username: string;
  total_score: number;
  games_played: number;
  rank_position: number;
}

interface UserRankResponse {
  data: UserRankData;
  cached: boolean;
  coalesced?: boolean;
}

interface CustomError {
  status?: number;
  message: string;
}

/**
 * GET /api/leaderboard
 * Get top 100 leaderboard
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    // Try cache first
    const cached = await getCachedLeaderboardTop100();
    if (cached) {
      res.json({ data: cached, cached: true } as LeaderboardResponse);
      return;
    }

    // Use request coalescing to prevent thundering herd when cache expires
    // Multiple simultaneous requests will share a single database fetch
    const result = await coalesce('leaderboard:top100', async (): Promise<LeaderboardResponse> => {
      // Double-check cache in case another request just populated it
      const recheck = await getCachedLeaderboardTop100();
      if (recheck) {
        return { data: recheck, cached: true, coalesced: true };
      }

      // Fetch from Supabase
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('leaderboard')
        .select('player_id, username, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, total_score, games_played, games_won, ranked_mmr')
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
    const err = error as Error;
    logger.error('API', `Leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboard/rank/:userId
 * Get a specific user's rank
 */
router.get('/rank/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    // Try cache first
    const cached = await getCachedUserRank(userId);
    if (cached) {
      res.json({ data: cached, cached: true } as UserRankResponse);
      return;
    }

    // Use request coalescing per userId to prevent duplicate fetches
    const result = await coalesce(`leaderboard:rank:${userId}`, async (): Promise<UserRankResponse> => {
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
        const customError: CustomError = { status: 404, message: 'User not found in leaderboard' };
        throw customError;
      }

      // Count how many users have a higher score to get rank
      const { count, error: countError } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('total_score', userData.total_score);

      if (countError) {
        throw new Error(`Rank count error: ${countError.message}`);
      }

      const rankData: UserRankData = {
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
    const err = error as CustomError;
    if (err.status) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    logger.error('API', `User rank error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
