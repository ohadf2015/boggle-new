import { router } from './trpc';
import { leaderboardRouter } from './routers/leaderboard';
import { playerProfileRouter } from './routers/playerProfile';
import { dailyChallengeRouter } from './routers/dailyChallenge';

export const appRouter = router({
  leaderboard: leaderboardRouter,
  playerProfile: playerProfileRouter,
  dailyChallenge: dailyChallengeRouter,
});

export type AppRouter = typeof appRouter;
