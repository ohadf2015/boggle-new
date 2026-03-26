import { router } from './trpc';
import { leaderboardRouter } from './routers/leaderboard';
import { playerProfileRouter } from './routers/playerProfile';

export const appRouter = router({
  leaderboard: leaderboardRouter,
  playerProfile: playerProfileRouter,
});

export type AppRouter = typeof appRouter;
