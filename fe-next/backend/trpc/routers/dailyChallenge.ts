import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { cacheAside } from '../../cache/redisCache';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

export const dailyChallengeRouter = router({
  getCurrent: loggedProcedure.query(async () => {
    if (!isSupabaseConfigured()) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Daily challenge service not available' });
    }

    const today = new Date().toISOString().slice(0, 10);

    return cacheAside(`trpc:dailyChallenge:current:${today}`, async () => {
      const supabase = getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection unavailable' });
      }

      const { data, error } = await supabase
        .from('daily_puzzles')
        .select('*')
        .eq('puzzle_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('TRPC', `Daily challenge getCurrent error: ${error.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch daily challenge' });
      }

      return {
        data: data || null,
        date: today,
      };
    }, 300); // 5 min TTL
  }),

  getHistory: loggedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
    }).optional())
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Daily challenge service not available' });
      }

      const limit = input?.limit ?? 10;

      return cacheAside(`trpc:dailyChallenge:history:${limit}`, async () => {
        const supabase = getSupabase();
        if (!supabase) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection unavailable' });
        }

        const { data, error } = await supabase
          .from('daily_puzzles')
          .select('*')
          .order('puzzle_date', { ascending: false })
          .limit(limit);

        if (error) {
          logger.error('TRPC', `Daily challenge getHistory error: ${error.message}`);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch challenge history' });
        }

        return { data: data || [] };
      }, 1800); // 30 min TTL
    }),
});
