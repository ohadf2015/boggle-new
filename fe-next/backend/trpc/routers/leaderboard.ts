import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { getTopPlayersByScore, getTopPlayersByMmr } from '../../db/queries/leaderboardQueries';
import { getCurrentSeasonDynamic, getSeasonRewards } from '@/lib/seasons';

import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import { getCachedLeaderboardTop100, cacheLeaderboardTop100, getCachedUserRank, cacheUserRank } from '../../redisClient';
import { coalesce } from '../../utils/requestCoalescing';

export const leaderboardRouter = router({
  getTop: loggedProcedure
    .input(z.object({
      period: z.enum(['daily', 'weekly', 'season', 'allTime']).default('season'),
      limit: z.number().min(1).max(100).default(20),
      seasonId: z.number().int().positive().optional(),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
      }

      const targetSeasonId = input.period === 'season'
        ? (input.seasonId ?? getCurrentSeasonDynamic().id)
        : undefined;

      // Try cache first (season-namespaced when applicable)
      const cached = await getCachedLeaderboardTop100(targetSeasonId);
      if (cached) {
        return { data: cached, cached: true };
      }

      const coalesceKey = targetSeasonId
        ? `leaderboard:top100:season:${targetSeasonId}`
        : 'leaderboard:top100';

      const result = await coalesce(coalesceKey, async () => {
        const recheck = await getCachedLeaderboardTop100(targetSeasonId);
        if (recheck) {
          return { data: recheck, cached: true, coalesced: true };
        }

        let entries;
        try {
          const drizzleData = await getTopPlayersByScore(
            input.limit,
            targetSeasonId !== undefined ? { seasonId: targetSeasonId } : {}
          );
          entries = drizzleData.map(row => ({
            player_id: row.playerId,
            username: row.username,
            display_name: row.displayName,
            avatar_emoji: row.avatarEmoji,
            avatar_color: row.avatarColor,
            total_score: row.totalScore,
            games_played: row.gamesPlayed,
            games_won: row.gamesWon,
            ranked_mmr: 0,
            season_id: row.seasonId,
          }));
        } catch (drizzleErr) {
          logger.warn('TRPC', `Drizzle leaderboard query failed, falling back to Supabase: ${drizzleErr}`);
          const supabase = getSupabase();
          if (!supabase) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
          }
          // Post-seasons migration the leaderboard has multiple rows per
          // player (one per season). Filter when querying a specific season
          // so the fallback doesn't merge seasons and double-rank a player.
          let query = supabase
            .from('leaderboard')
            .select('player_id, username, display_name, avatar_emoji, avatar_color, avatar_image, total_score, games_played, games_won, ranked_mmr, season_id');
          if (targetSeasonId !== undefined) {
            query = query.eq('season_id', targetSeasonId);
          }
          const { data, error } = await query
            .order('total_score', { ascending: false })
            .limit(input.limit);

          if (error) {
            logger.error('TRPC', 'Leaderboard fetch error', { error: error.message });
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leaderboard' });
          }
          entries = data || [];
        }

        if (entries.length > 0) {
          await cacheLeaderboardTop100(entries, targetSeasonId);
        }

        return { data: entries, cached: false };
      });

      return result;
    }),

  claimSeasonRewards: loggedProcedure
    .input(z.object({
      seasonId: z.number().int().positive(),
      playerId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const supabase = getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database unavailable' });
      }

      // Look up player's archived peak tier for that season
      const { data: archived, error: archiveError } = await supabase
        .from('season_leaderboards')
        .select('peak_tier')
        .eq('season_id', input.seasonId)
        .eq('player_id', input.playerId)
        .maybeSingle();

      const tier = archived?.peak_tier ?? 'Bronze';
      const rewards = getSeasonRewards(tier, input.seasonId);
      const badgeIds = rewards.badges.map((b: { id: string }) => b.id);

      const { data, error } = await supabase.rpc('claim_season_rewards', {
        p_player_id: input.playerId,
        p_season_id: input.seasonId,
        p_coins: rewards.coins,
        p_badges: badgeIds,
      });

      if (error) {
        if (archiveError) {
          logger.warn('TRPC', 'Season archive lookup failed; proceeding with default tier', {
            error: archiveError.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Reward claim failed: ${error.message}`,
        });
      }

      const claimedNow = data === true;
      return {
        success: claimedNow,
        alreadyClaimed: !claimedNow,
        rewards,
        tier,
      };
    }),

  getSeasonHistory: loggedProcedure
    .input(z.object({ playerId: z.string().uuid() }))
    .query(async ({ input }) => {
      const supabase = getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database unavailable' });
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('season_peak_tier')
        .eq('id', input.playerId)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Season history fetch failed: ${error.message}`,
        });
      }

      const peakTiers = Array.isArray(data?.season_peak_tier)
        ? (data.season_peak_tier as Array<{
            seasonId: number;
            tier: string;
            rankPosition?: number;
            claimedAt: string | null;
          }>)
        : [];

      return { data: peakTiers };
    }),

  getSeasonRecap: loggedProcedure
    .input(z.object({
      playerId: z.string().uuid(),
      seasonId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const supabase = getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database unavailable' });
      }

      const { data, error } = await supabase
        .from('season_leaderboards')
        .select('total_score, games_played, games_won, ranked_mmr, rank_position, peak_tier')
        .eq('season_id', input.seasonId)
        .eq('player_id', input.playerId)
        .maybeSingle();

      if (error) {
        logger.warn('TRPC', 'getSeasonRecap fetch error', { error: error.message });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Recap fetch failed: ${error.message}`,
        });
      }

      if (!data) {
        return { data: null };
      }

      return {
        data: {
          totalScore: data.total_score ?? 0,
          gamesPlayed: data.games_played ?? 0,
          gamesWon: data.games_won ?? 0,
          rankedMmr: data.ranked_mmr ?? 0,
          rankPosition: data.rank_position ?? null,
          peakTier: data.peak_tier ?? 'Bronze',
        },
      };
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
        if (!supabase) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }
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

  getCurrentSeasonRank: loggedProcedure
    .input(z.object({ playerId: z.string().uuid() }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
      }
      const supabase = getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }
      const { data, error } = await supabase
        .rpc('get_user_current_season_rank', { p_player_id: input.playerId });
      if (error) {
        logger.warn('TRPC', 'getCurrentSeasonRank RPC error', { error: error.message });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `RPC error: ${error.message}` });
      }
      const row = data?.[0];
      if (!row) return { data: null };
      return {
        data: {
          rankPosition: row.rank_position as number,
          totalScore: row.total_score as number,
          gamesPlayed: row.games_played as number,
          seasonId: row.season_id as number,
          totalPlayers: row.total_players as number,
          tierId: row.tier_id as string,
        },
      };
    }),

  getRankedTop: loggedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
      }
      try {
        const entries = await getTopPlayersByMmr(input.limit);
        return { data: entries, cached: false };
      } catch (err) {
        logger.error('TRPC', 'Ranked leaderboard fetch error', { error: (err as Error).message });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch ranked leaderboard' });
      }
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
