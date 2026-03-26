import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  avatarImage?: string;
}

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  cached: boolean;
}

export function useLeaderboard(period: 'daily' | 'weekly' | 'allTime' = 'weekly', limit = 20) {
  return useQuery<LeaderboardEntry[], Error>({
    queryKey: queryKeys.leaderboard.byPeriod(period, limit),
    queryFn: async ({ signal }): Promise<LeaderboardEntry[]> => {
      const res = await fetch(`/api/leaderboard?period=${period}&limit=${limit}`, { signal });
      if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
      const json: LeaderboardResponse = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });
}
