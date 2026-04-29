'use client';

/**
 * usePlayerPercentile — Thin wrapper around `playerProfile.get` that
 * exposes only the fields needed by GlobalRankBadge (percentile, totalGames,
 * totalScore, totalPlayersAbove). Caches via tRPC's react-query layer; the
 * server-side cache-aside is 5min, so this stays cheap.
 */

import { trpc } from '@/lib/trpc';

export interface PlayerPercentileData {
  percentile: number;
  totalGames: number;
  totalScore: number;
  totalPlayersAbove: number;
}

interface Result {
  data: PlayerPercentileData | null;
  isLoading: boolean;
}

export function usePlayerPercentile(userId: string | null): Result {
  const query = trpc.playerProfile.get.useQuery(
    { id: userId ?? '' },
    {
      enabled: !!userId,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  if (!userId) return { data: null, isLoading: false };

  if (query.isLoading || !query.data) {
    return { data: null, isLoading: query.isLoading };
  }

  const d = query.data as {
    percentile?: number;
    totalGames?: number;
    totalScore?: number;
    totalPlayersAbove?: number;
  };

  return {
    data: {
      percentile: d.percentile ?? 100,
      totalGames: d.totalGames ?? 0,
      totalScore: d.totalScore ?? 0,
      totalPlayersAbove: d.totalPlayersAbove ?? 0,
    },
    isLoading: false,
  };
}
