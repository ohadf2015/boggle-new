import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const playerProfileRouter = router({
  get: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return {
        userId: input.userId,
        message: 'tRPC player profile endpoint — migrate implementation from Express route',
      };
    }),
});
