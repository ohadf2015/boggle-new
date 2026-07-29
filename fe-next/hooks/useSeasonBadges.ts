'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { selectEarnedBadges, type SeasonRankBadge } from '@/lib/seasonBadges';

export interface UseSeasonBadgesResult {
  badges: SeasonRankBadge[];
  isLoading: boolean;
}

/**
 * Earned top-5 placement badges for a player. Re-uses the existing
 * `getSeasonHistory` query so the network footprint is zero when the
 * season-claim flow already populated cache.
 */
export function useSeasonBadges(playerId: string | null | undefined): UseSeasonBadgesResult {
  const enabled = !!playerId;
  const query = trpc.leaderboard.getSeasonHistory.useQuery(
    { playerId: playerId ?? '00000000-0000-0000-0000-000000000000' },
    { enabled, staleTime: 60_000 },
  );

  const badges = useMemo(
    () => selectEarnedBadges(query.data?.data ?? []),
    [query.data],
  );

  return { badges, isLoading: query.isLoading };
}
