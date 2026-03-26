import { useQuery } from '@tanstack/react-query';

interface PlayerProfile {
  id: string;
  displayName: string;
  avatarImage?: string;
  level: number;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
}

export function usePlayerProfile(userId: string | null) {
  return useQuery({
    queryKey: ['playerProfile', userId],
    queryFn: async (): Promise<PlayerProfile> => {
      const res = await fetch(`/api/player-profile?userId=${userId}`);
      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
