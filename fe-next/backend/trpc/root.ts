import { router } from './trpc';
import { leaderboardRouter } from './routers/leaderboard';
import { playerProfileRouter } from './routers/playerProfile';
import { dailyChallengeRouter } from './routers/dailyChallenge';
import { singlePlayerRouter } from './routers/singlePlayer';
import { dictionaryRouter } from './routers/dictionary';

export const appRouter = router({
  leaderboard: leaderboardRouter,
  playerProfile: playerProfileRouter,
  dailyChallenge: dailyChallengeRouter,
  singlePlayer: singlePlayerRouter,
  dictionary: dictionaryRouter,
});

export type AppRouter = typeof appRouter;
