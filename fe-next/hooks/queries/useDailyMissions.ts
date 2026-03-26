import { useQuery } from '@tanstack/react-query';

interface DailyMission {
  id: string;
  type: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
}

export function useDailyMissions(userId: string | null) {
  return useQuery({
    queryKey: ['dailyMissions', userId],
    queryFn: async (): Promise<DailyMission[]> => {
      const res = await fetch(`/api/daily-challenge?type=missions&userId=${userId}`);
      if (!res.ok) throw new Error(`Daily missions fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
