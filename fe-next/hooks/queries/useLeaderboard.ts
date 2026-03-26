import { useQuery } from '@tanstack/react-query';

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
    queryKey: ['leaderboard', period, limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await fetch(`/api/leaderboard?period=${period}&limit=${limit}`);
      if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
      const json: LeaderboardResponse = await res.json();
      return json.data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
