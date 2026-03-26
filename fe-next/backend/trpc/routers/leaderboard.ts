import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const leaderboardRouter = router({
  getTop: publicProcedure
    .input(z.object({
      period: z.enum(['daily', 'weekly', 'allTime']).default('weekly'),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return {
        period: input.period,
        limit: input.limit,
        entries: [] as Array<{ userId: string; displayName: string; score: number; rank: number }>,
        message: 'tRPC leaderboard endpoint — migrate implementation from Express route',
      };
    }),

  getPlayerRank: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return { userId: input.userId, rank: null as number | null };
    }),
});
