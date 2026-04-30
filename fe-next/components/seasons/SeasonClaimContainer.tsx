'use client';

/**
 * Global mount point for the season-end claim flow.
 *
 * On every authenticated app session this checks the player's
 * `season_peak_tier` JSONB array (via tRPC) for any past season whose
 * `claimedAt` is null and surfaces the SeasonClaimModal for the first one.
 *
 * Dismissal state lives in sessionStorage keyed by season id — closing
 * the modal won't re-trigger it the same session, but a real claim
 * (mutation success) is the durable resolution.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSeasonClaim } from '@/hooks/useSeasonClaim';
import { trpc } from '@/lib/trpc';
import { SeasonClaimModal } from './SeasonClaimModal';

const DISMISS_KEY = (seasonId: number) => `season-claim-dismissed:${seasonId}`;
const CLAIMED_KEY = (seasonId: number) => `season-claim-success:${seasonId}`;

export const SeasonClaimContainer: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const playerId = isAuthenticated && !isOnCrazyGamesPlatform ? user?.id ?? null : null;
  const { next, isClaiming, claim } = useSeasonClaim(playerId);

  const [dismissed, setDismissed] = useState<Set<number>>(() => new Set());
  const [justClaimed, setJustClaimed] = useState<Set<number>>(() => new Set());

  // Pull season-archive stats (games_played, total_score) for the modal recap.
  // The query stays disabled until we have a real season to claim; cached 5min.
  const recapQuery = trpc.leaderboard.getSeasonRecap.useQuery(
    {
      playerId: playerId ?? '00000000-0000-0000-0000-000000000000',
      seasonId: next?.seasonId ?? 0,
    },
    {
      enabled: !!playerId && !!next,
      staleTime: 5 * 60_000,
    },
  );

  // Hydrate session-scoped dismissals on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!next) return;
    const isDismissed = sessionStorage.getItem(DISMISS_KEY(next.seasonId)) === '1';
    const wasClaimed = sessionStorage.getItem(CLAIMED_KEY(next.seasonId)) === '1';
    if (isDismissed) setDismissed((s) => new Set(s).add(next.seasonId));
    if (wasClaimed) setJustClaimed((s) => new Set(s).add(next.seasonId));
  }, [next]);

  const onClose = useCallback(() => {
    if (!next) return;
    sessionStorage.setItem(DISMISS_KEY(next.seasonId), '1');
    setDismissed((s) => new Set(s).add(next.seasonId));
  }, [next]);

  const onClaim = useCallback(async () => {
    if (!next) return;
    const result = await claim(next.seasonId);
    if (result.success || result.alreadyClaimed) {
      sessionStorage.setItem(CLAIMED_KEY(next.seasonId), '1');
      setJustClaimed((s) => new Set(s).add(next.seasonId));
    }
  }, [next, claim]);

  if (!playerId || !next) return null;
  if (dismissed.has(next.seasonId)) return null;

  const isClaimed = justClaimed.has(next.seasonId);

  return (
    <SeasonClaimModal
      seasonId={next.seasonId}
      seasonName={`Season ${next.seasonId}`}
      tier={next.tier}
      rankPosition={next.rankPosition}
      rewards={next.rewards}
      isClaiming={isClaiming}
      isClaimed={isClaimed}
      recap={recapQuery.data?.data ?? null}
      onClaim={onClaim}
      onClose={onClose}
    />
  );
};
