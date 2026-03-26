import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');
const { getCachedLeaderboardTop100, cacheLeaderboardTop100, getCachedUserRank, cacheUserRank } = require('../../redisClient');
const { coalesce } = require('../../utils/requestCoalescing');

export const leaderboardRouter = router({
  getTop: loggedProcedure
    .input(z.object({
      period: z.enum(['daily', 'weekly', 'allTime']).default('weekly'),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
      }

      // Try cache first
      const cached = await getCachedLeaderboardTop100();
      if (cached) {
        return { data: cached, cached: true };
      }

      // Use request coalescing to prevent thundering herd
      const result = await coalesce('leaderboard:top100', async () => {
        // Double-check cache
        const recheck = await getCachedLeaderboardTop100();
        if (recheck) {
          return { data: recheck, cached: true, coalesced: true };
        }

        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('leaderboard')
          .select('player_id, username, display_name, avatar_emoji, avatar_color, avatar_image, total_score, games_played, games_won, ranked_mmr')
          .order('total_score', { ascending: false })
          .limit(input.limit);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Leaderboard fetch error: ${error.message}` });
        }

        if (data) {
          await cacheLeaderboardTop100(data);
        }

        return { data: data || [], cached: false };
      });

      return result;
    }),

  getPlayerRank: loggedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
      }

      const { userId } = input;

      // Try cache first
      const cached = await getCachedUserRank(userId);
      if (cached) {
        return { data: cached, cached: true };
      }

      // Use request coalescing per userId
      const result = await coalesce(`leaderboard:rank:${userId}`, async () => {
        // Double-check cache
        const recheck = await getCachedUserRank(userId);
        if (recheck) {
          return { data: recheck, cached: true, coalesced: true };
        }

        const supabase = getSupabase();
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_user_leaderboard_rank', { target_user_id: userId });

        if (rpcError) {
          // Legacy fallback if RPC doesn't exist
          if (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
            logger.warn('TRPC', 'get_user_leaderboard_rank RPC not found, using fallback queries');
            return await fetchRankLegacy(supabase, userId);
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `RPC error: ${rpcError.message}` });
        }

        const userData = rpcData?.[0];
        if (!userData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found in leaderboard' });
        }

        const rankData = {
          player_id: userData.player_id,
          username: userData.username,
          total_score: userData.total_score,
          games_played: userData.games_played,
          rank_position: userData.rank_position,
        };

        await cacheUserRank(userId, rankData);
        return { data: rankData, cached: false };
      });

      return result;
    }),
});

/** Legacy fallback for rank calculation when RPC is not available */
async function fetchRankLegacy(supabase: any, userId: string) {
  const { data: userData, error: userError } = await supabase
    .from('leaderboard')
    .select('player_id, username, total_score, games_played')
    .eq('player_id', userId)
    .single();

  if (userError || !userData) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found in leaderboard' });
  }

  const { count, error: countError } = await supabase
    .from('leaderboard')
    .select('player_id', { count: 'exact', head: true })
    .gt('total_score', userData.total_score);

  if (countError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Rank count error: ${countError.message}` });
  }

  const rankData = {
    ...userData,
    rank_position: (count || 0) + 1,
  };

  await cacheUserRank(userId, rankData);
  return { data: rankData, cached: false };
}
