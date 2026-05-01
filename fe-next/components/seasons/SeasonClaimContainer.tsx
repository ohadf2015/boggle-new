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
import { useSeasonClaim, type UnclaimedSeason } from '@/hooks/useSeasonClaim';
import { trpc } from '@/lib/trpc';
import logger from '@/utils/logger';
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
  // Snapshot the first surfaced season — keeps the modal mounted after a
  // successful claim invalidates the query and drops `next` to null. Without
  // this, the modal would unmount the instant the user clicks claim, which
  // looked like "click does nothing".
  const [active, setActive] = useState<UnclaimedSeason | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (next && !active) setActive(next);
  }, [next, active]);

  // Pull season-archive stats (games_played, total_score) for the modal recap.
  const recapQuery = trpc.leaderboard.getSeasonRecap.useQuery(
    {
      playerId: playerId ?? '00000000-0000-0000-0000-000000000000',
      seasonId: active?.seasonId ?? 0,
    },
    {
      enabled: !!playerId && !!active,
      staleTime: 5 * 60_000,
    },
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!active) return;
    const isDismissed = sessionStorage.getItem(DISMISS_KEY(active.seasonId)) === '1';
    const wasClaimed = sessionStorage.getItem(CLAIMED_KEY(active.seasonId)) === '1';
    if (isDismissed) setDismissed((s) => new Set(s).add(active.seasonId));
    if (wasClaimed) setJustClaimed((s) => new Set(s).add(active.seasonId));
  }, [active]);

  const onClose = useCallback(() => {
    if (!active) return;
    sessionStorage.setItem(DISMISS_KEY(active.seasonId), '1');
    setDismissed((s) => new Set(s).add(active.seasonId));
    setActive(null);
  }, [active]);

  const onClaim = useCallback(async () => {
    if (!active) return;
    setClaimError(null);
    try {
      const result = await claim(active.seasonId);
      if (result.success || result.alreadyClaimed) {
        sessionStorage.setItem(CLAIMED_KEY(active.seasonId), '1');
        setJustClaimed((s) => new Set(s).add(active.seasonId));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      logger.error('SEASON_CLAIM', 'mutation failed', { error: msg, seasonId: active.seasonId });
      setClaimError(msg);
    }
  }, [active, claim]);

  if (!playerId || !active) return null;
  if (dismissed.has(active.seasonId)) return null;

  const isClaimed = justClaimed.has(active.seasonId);

  return (
    <SeasonClaimModal
      seasonId={active.seasonId}
      seasonName={`Season ${active.seasonId}`}
      tier={active.tier}
      rankPosition={active.rankPosition}
      rewards={active.rewards}
      isClaiming={isClaiming}
      isClaimed={isClaimed}
      recap={recapQuery.data?.data ?? null}
      claimError={claimError}
      onClaim={onClaim}
      onClose={onClose}
    />
  );
};
