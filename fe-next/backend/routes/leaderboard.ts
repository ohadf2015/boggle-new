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

/**
 * Legacy fallback for rank calculation when RPC is not available
 * Uses two separate queries (kept for backwards compatibility during migration)
 */
async function fetchRankLegacy(supabase: any, userId: string): Promise<UserRankResponse> {
  // First get the user's data
  const { data: userData, error: userError } = await supabase
    .from('leaderboard')
    .select('player_id, username, total_score, games_played')
    .eq('player_id', userId)
    .single();

  if (userError || !userData) {
    const customError: CustomError = { status: 404, message: 'User not found in leaderboard' };
    throw customError;
  }

  // Count higher scores in a separate query
  const { count, error: countError } = await supabase
    .from('leaderboard')
    .select('player_id', { count: 'exact', head: true })
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
}

interface LeaderboardEntry {
  player_id: string;
  username: string;
  display_name?: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string;
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
        .select('player_id, username, display_name, avatar_emoji, avatar_color, avatar_image, total_score, games_played, games_won, ranked_mmr')
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

    const userId = req.params.userId as string;
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

      // Fetch from Supabase using optimized RPC function
      // This combines user data + rank calculation into a single database query
      const supabase = getSupabase();
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_leaderboard_rank', { target_user_id: userId });

      if (rpcError) {
        // If RPC doesn't exist yet (migration not run), fall back to legacy approach
        if (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
          logger.warn('API', 'get_user_leaderboard_rank RPC not found, using fallback queries');
          return await fetchRankLegacy(supabase, userId);
        }
        throw new Error(`RPC error: ${rpcError.message}`);
      }

      // RPC returns array, take first result
      const userData = rpcData?.[0];
      if (!userData) {
        const customError: CustomError = { status: 404, message: 'User not found in leaderboard' };
        throw customError;
      }

      const rankData: UserRankData = {
        player_id: userData.player_id,
        username: userData.username,
        total_score: userData.total_score,
        games_played: userData.games_played,
        rank_position: userData.rank_position
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
