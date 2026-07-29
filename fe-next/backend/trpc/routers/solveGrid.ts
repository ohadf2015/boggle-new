import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { cacheAside } from '../../cache/redisCache';

const { load: loadDictionary } = require('../../dictionary');
const { findWordsForBots } = require('../../modules/boggleSolver');

interface BotWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface BlacklistEntry {
  word: string;
}

async function filterBlacklistedWords(words: BotWords, language: string): Promise<BotWords> {
  const { getSupabase } = require('../../modules/supabaseServer');
  const supabase = getSupabase();

  if (!supabase) {
    logger.debug('SOLVE-GRID', 'Supabase not configured, skipping blacklist filter');
    return words;
  }

  try {
    const { data: blacklist, error } = await supabase
      .from('bot_word_blacklist')
      .select('word')
      .eq('language', language);

    if (error) {
      const errMsg = error.message.startsWith('<!') ? 'Supabase 502 Bad Gateway' : error.message.slice(0, 200);
      logger.debug('SOLVE-GRID', `Blacklist query error (returning unfiltered): ${errMsg}`);
      return words;
    }

    const blacklistedSet = new Set(
      ((blacklist || []) as BlacklistEntry[]).map((b: BlacklistEntry) => b.word.toLowerCase())
    );

    return {
      easy: words.easy.filter((w: string) => !blacklistedSet.has(w.toLowerCase())),
      medium: words.medium.filter((w: string) => !blacklistedSet.has(w.toLowerCase())),
      hard: words.hard.filter((w: string) => !blacklistedSet.has(w.toLowerCase())),
    };
  } catch (err) {
    const error = err as Error;
    logger.debug('SOLVE-GRID', `Blacklist filter error (returning unfiltered): ${error.message}`);
    return words;
  }
}

export const solveGridRouter = router({
  solve: loggedProcedure
    .input(z.object({
      grid: z.array(z.array(z.string().min(1)))
        .min(4).max(11)
        .refine(
          (g) => {
            const rowLen = g[0]?.length ?? 0;
            return rowLen >= 4 && rowLen <= 11 && g.every((r) => r.length === rowLen);
          },
          { message: 'Grid must be rectangular, between 4x4 and 11x11' }
        ),
      language: z.string().default('en'),
    }))
    .mutation(async ({ input }) => {
      const { grid, language } = input;

      // Deterministic — cache by grid+language
      const cacheKey = `solveGrid:${language}:${grid.map((r) => r.join('')).join('|')}`;

      try {
        const result = await cacheAside<{ success: true; words: BotWords }>(cacheKey, async () => {
          await loadDictionary();

          const words = findWordsForBots(grid, language, {
            minLength: 3,
            maxLength: 10,
          }) as BotWords;

          const filteredWords = await filterBlacklistedWords(words, language);

          return { success: true as const, words: filteredWords };
        }, 600);

        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('SOLVE-GRID', `Error: ${msg}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to solve grid' });
      }
    }),
});
