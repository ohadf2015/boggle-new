import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { cacheAside } from '../../cache/redisCache';
import {
  getPackById,
  getPackGallery,
} from '../../modules/supabase/ugcPacks';
import {
  getBoardByCode,
  getGallery,
  getFeaturedBoards,
  type GalleryParams,
} from '../../modules/supabase/ugcBoards';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ugcRouter = router({
  // ─── Packs ───

  packGallery: loggedProcedure
    .input(z.object({
      sort: z.enum(['newest', 'popular', 'upvotes']).default('newest'),
      language: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const cacheKey = `ugc:packs:gallery:${input.sort}:${input.language ?? 'all'}:${input.page}:${input.limit}`;
      try {
        return await cacheAside(cacheKey, () => getPackGallery(input), 60);
      } catch (error) {
        const err = error as Error;
        logger.error('UGC_TRPC', `packGallery error: ${err.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch pack gallery' });
      }
    }),

  packById: loggedProcedure
    .input(z.object({
      packId: z.string().regex(UUID_RE, 'Invalid pack ID format'),
    }))
    .query(async ({ input }) => {
      try {
        const pack = await getPackById(input.packId);
        if (!pack) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pack not found' });
        }
        return pack;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const err = error as Error;
        logger.error('UGC_TRPC', `packById error: ${err.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch pack' });
      }
    }),

  // ─── Boards ───

  boardGallery: loggedProcedure
    .input(z.object({
      sort: z.enum(['newest', 'popular', 'top_rated', 'featured']).default('newest'),
      language: z.string().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const cacheKey = `ugc:boards:gallery:${input.sort}:${input.language ?? 'all'}:${input.difficulty ?? 'all'}:${input.page}:${input.limit}`;
      try {
        const params: GalleryParams = {
          sort: input.sort,
          page: input.page,
          limit: input.limit,
        };
        if (input.language) params.language = input.language;
        if (input.difficulty) params.difficulty = input.difficulty;

        return await cacheAside(cacheKey, () => getGallery(params), 60);
      } catch (error) {
        const err = error as Error;
        logger.error('UGC_TRPC', `boardGallery error: ${err.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch board gallery' });
      }
    }),

  boardByCode: loggedProcedure
    .input(z.object({
      boardCode: z.string().min(1),
    }))
    .query(async ({ input }) => {
      try {
        const board = await getBoardByCode(input.boardCode);
        if (!board) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Board not found' });
        }
        return board;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const err = error as Error;
        logger.error('UGC_TRPC', `boardByCode error: ${err.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch board' });
      }
    }),

  featuredBoards: loggedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(6),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 6;
      const cacheKey = `ugc:boards:featured:${limit}`;
      try {
        return await cacheAside(cacheKey, async () => {
          const boards = await getFeaturedBoards(limit);
          return { boards };
        }, 300);
      } catch (error) {
        const err = error as Error;
        logger.error('UGC_TRPC', `featuredBoards error: ${err.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch featured boards' });
      }
    }),
});
