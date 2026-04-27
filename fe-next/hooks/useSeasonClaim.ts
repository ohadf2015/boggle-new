'use client';

import { useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { getSeasonRewards, type SeasonRewardsResult } from '@/lib/seasons';

export interface UnclaimedSeason {
  seasonId: number;
  tier: string;
  rankPosition?: number;
  rewards: SeasonRewardsResult;
}

export interface UseSeasonClaimResult {
  unclaimedSeasons: UnclaimedSeason[];
  next: UnclaimedSeason | null;
  isLoading: boolean;
  isClaiming: boolean;
  claim: (seasonId: number) => Promise<{ success: boolean; alreadyClaimed: boolean }>;
}

/**
 * Reads `season_peak_tier` for the player and surfaces any seasons whose
 * `claimedAt` is null. Pairs with the `claimSeasonRewards` mutation.
 */
export function useSeasonClaim(playerId: string | null | undefined): UseSeasonClaimResult {
  const enabled = !!playerId;
  const query = trpc.leaderboard.getSeasonHistory.useQuery(
    { playerId: playerId ?? '00000000-0000-0000-0000-000000000000' },
    { enabled, staleTime: 30_000 }
  );
  const utils = trpc.useUtils();
  const mutation = trpc.leaderboard.claimSeasonRewards.useMutation({
    onSuccess: () => {
      if (playerId) utils.leaderboard.getSeasonHistory.invalidate({ playerId });
    },
  });

  const unclaimedSeasons = useMemo<UnclaimedSeason[]>(() => {
    const data = query.data?.data ?? [];
    return data
      .filter((entry) => !entry.claimedAt)
      .map((entry) => ({
        seasonId: entry.seasonId,
        tier: entry.tier,
        rankPosition: entry.rankPosition,
        rewards: getSeasonRewards(entry.tier, entry.seasonId),
      }));
  }, [query.data]);

  const claim = useCallback(
    async (seasonId: number) => {
      if (!playerId) return { success: false, alreadyClaimed: false };
      const result = await mutation.mutateAsync({ seasonId, playerId });
      return { success: result.success, alreadyClaimed: result.alreadyClaimed };
    },
    [mutation, playerId]
  );

  return {
    unclaimedSeasons,
    next: unclaimedSeasons[0] ?? null,
    isLoading: query.isLoading,
    isClaiming: mutation.isPending,
    claim,
  };
}
