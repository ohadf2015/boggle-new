import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { cacheAside } from '../../cache/redisCache';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

export const singlePlayerRouter = router({
  submitScore: loggedProcedure
    .input(z.object({
      userId: z.string().min(1).max(100),
      score: z.number().int().min(0).max(100000),
      wordsFound: z.number().int().min(0).max(500),
      longestWord: z.string().optional(),
      language: z.enum(['en', 'he', 'sv', 'ja', 'es']).default('en'),
      gameMode: z.string().min(1),
      durationSeconds: z.number().int().min(0).max(600),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database not available' });
      }

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('game_results')
        .insert({
          player_id: input.userId,
          score: input.score,
          words_found: input.wordsFound,
          longest_word: input.longestWord ?? null,
          language: input.language,
          game_mode: input.gameMode,
          duration_seconds: input.durationSeconds,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('TRPC', `submitScore error: ${error.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save score' });
      }

      return { success: true, id: data?.id };
    }),

  getHistory: loggedProcedure
    .input(z.object({
      userId: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(10),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database not available' });
      }

      const cacheKey = `sp:history:${input.userId}:${input.limit}:${input.offset}`;
      const result = await cacheAside(cacheKey, async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('game_results')
          .select('id, score, words_found, longest_word, language, game_mode, duration_seconds, created_at')
          .eq('player_id', input.userId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          logger.error('TRPC', `getHistory error: ${error.message}`);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch history' });
        }

        return data || [];
      }, 60);

      return { data: result };
    }),
});
