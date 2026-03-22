'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTierFromElo,
  getTierProgress,
  getNextTier,
  getSeasonNumber,
  getDaysUntilSeasonEnd,
} from '@/lib/ranked/tiers';

export function useRankedTier(overrideElo?: number) {
  const { profile } = useAuth();
  const elo = overrideElo ?? (profile as any)?.ranked_mmr ?? 0;

  return useMemo(
    () => ({
      tier: getTierFromElo(elo),
      elo,
      progress: getTierProgress(elo),
      nextTier: getNextTier(elo),
      season: getSeasonNumber(),
      daysRemaining: getDaysUntilSeasonEnd(),
    }),
    [elo]
  );
}
