import { router } from './trpc';
import { leaderboardRouter } from './routers/leaderboard';
import { playerProfileRouter } from './routers/playerProfile';
import { dailyChallengeRouter } from './routers/dailyChallenge';
import { singlePlayerRouter } from './routers/singlePlayer';
import { dictionaryRouter } from './routers/dictionary';
import { analyticsRouter } from './routers/analytics';
import { solveGridRouter } from './routers/solveGrid';
import { ugcRouter } from './routers/ugc';

export const appRouter = router({
  leaderboard: leaderboardRouter,
  playerProfile: playerProfileRouter,
  dailyChallenge: dailyChallengeRouter,
  singlePlayer: singlePlayerRouter,
  dictionary: dictionaryRouter,
  analytics: analyticsRouter,
  solveGrid: solveGridRouter,
  ugc: ugcRouter,
});

export type AppRouter = typeof appRouter;
