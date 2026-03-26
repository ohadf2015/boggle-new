import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

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
    queryKey: queryKeys.playerProfile.byId(userId ?? ''),
    queryFn: async ({ signal }): Promise<PlayerProfile> => {
      const res = await fetch(`/api/player-profile?userId=${userId}`, { signal });
      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
