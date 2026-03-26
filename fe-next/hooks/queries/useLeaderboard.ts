import { useQuery } from '@tanstack/react-query';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  avatarImage?: string;
}

export function useLeaderboard(period: 'daily' | 'weekly' | 'allTime' = 'weekly', limit = 20) {
  return useQuery({
    queryKey: ['leaderboard', period, limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await fetch(`/api/leaderboard?period=${period}&limit=${limit}`);
      if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
