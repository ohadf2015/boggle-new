import { trpc } from '@/lib/trpc';

interface DailyMission {
  id: string;
  type: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
}

/**
 * Fetches daily challenge data via tRPC.
 *
 * NOTE: The Express route `/api/daily-challenge` has no `?type=missions` param.
 * This hook now uses the tRPC `dailyChallenge.getCurrent` procedure which
 * queries `daily_puzzles` for today's challenge. If a dedicated missions table
 * is added later, create a separate tRPC procedure for it.
 */
export function useDailyMissions(userId: string | null) {
  return trpc.dailyChallenge.getCurrent.useQuery(undefined, {
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export type { DailyMission };
