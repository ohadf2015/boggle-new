'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getCurrentSeasonDynamic,
  getSeasonTimeRemaining,
  getSeasonRewards,
  type Season,
  type SeasonRewardsResult,
  type TimeRemaining,
} from '@/lib/seasons';
import { getRankTier } from '@/shared/utils/eloRating';

const TIER_ORDER = ['Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

function tierRank(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? 0 : idx;
}

export interface UseSeasonReturn {
  currentSeason: Season;
  timeRemaining: TimeRemaining;
  peakTier: string;
  seasonRewards: SeasonRewardsResult;
  hasSeenEndSummary: boolean;
  updatePeakTier: (elo: number) => void;
  dismissEndSummary: () => void;
}

export function useSeason(): UseSeasonReturn {
  const currentSeason = useMemo(() => getCurrentSeasonDynamic(), []);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => getSeasonTimeRemaining());
  const { user, isAuthenticated } = useAuth();
  const hasSyncedRef = useRef(false);

  const peakKey = `season-${currentSeason.id}-peakTier`;
  const endSummaryKey = `season-${currentSeason.id}-endSummarySeen`;

  const [peakTier, setPeakTier] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Unranked';
    return localStorage.getItem(peakKey) ?? 'Unranked';
  });

  const [hasSeenEndSummary, setHasSeenEndSummary] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(endSummaryKey) === 'true';
  });

  // Fetch from Supabase on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || hasSyncedRef.current || !supabase) return;
    hasSyncedRef.current = true;

    supabase
      .from('profiles')
      .select('season_peak_tier')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        // Schema is Array<{seasonId, tier, claimedAt?}> after the
        // 20260426_seasons_infrastructure migration. Tolerate the legacy
        // Record<string, string> shape too in case of rollback.
        const peakTiers = data.season_peak_tier;
        let serverTier: string | undefined;
        if (Array.isArray(peakTiers)) {
          const entry = (peakTiers as Array<{ seasonId: number; tier: string }>)
            .find((e) => e?.seasonId === currentSeason.id);
          serverTier = entry?.tier;
        } else if (peakTiers && typeof peakTiers === 'object') {
          serverTier = (peakTiers as Record<string, string>)[String(currentSeason.id)];
        }
        if (serverTier) {
          localStorage.setItem(peakKey, serverTier);
          setPeakTier(serverTier);
        }
      }, () => {});
  }, [isAuthenticated, user?.id, currentSeason.id, peakKey]);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getSeasonTimeRemaining());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const syncPeakTierToSupabase = useCallback((_newTier: string) => {
    // No-op: post-20260426 seasons migration, profiles.season_peak_tier is
    // an Array<{seasonId, tier, claimedAt}> populated solely by the
    // process_season_reset RPC at season end. Writing from the client here
    // would corrupt the array shape with the legacy object form. Live tier
    // tracking lives in localStorage (set by the caller) and on
    // leaderboard.ranked_mmr; the JSONB array is archive-only.
    void _newTier;
  }, []);

  const updatePeakTier = useCallback((elo: number) => {
    const tier = getRankTier(elo);
    setPeakTier((prev) => {
      if (tierRank(tier.name) > tierRank(prev)) {
        localStorage.setItem(peakKey, tier.name);
        syncPeakTierToSupabase(tier.name);
        return tier.name;
      }
      return prev;
    });
  }, [peakKey, syncPeakTierToSupabase]);

  const dismissEndSummary = useCallback(() => {
    setHasSeenEndSummary(true);
    localStorage.setItem(endSummaryKey, 'true');
  }, [endSummaryKey]);

  const seasonRewards = useMemo(
    () => getSeasonRewards(peakTier, currentSeason.id),
    [peakTier, currentSeason.id]
  );

  return {
    currentSeason,
    timeRemaining,
    peakTier,
    seasonRewards,
    hasSeenEndSummary,
    updatePeakTier,
    dismissEndSummary,
  };
}
