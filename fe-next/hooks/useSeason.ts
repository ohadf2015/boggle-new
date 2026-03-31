'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getCurrentSeason,
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
  const currentSeason = useMemo(() => getCurrentSeason(), []);
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
        const peakTiers = data.season_peak_tier as Record<string, string> | null;
        if (peakTiers && peakTiers[String(currentSeason.id)]) {
          const serverTier = peakTiers[String(currentSeason.id)];
          localStorage.setItem(peakKey, serverTier);
          setPeakTier(serverTier);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user?.id, currentSeason.id, peakKey]);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getSeasonTimeRemaining());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const syncPeakTierToSupabase = useCallback((newTier: string) => {
    if (!isAuthenticated || !user?.id || !supabase) return;
    // Read current, merge, write back
    supabase
      .from('profiles')
      .select('season_peak_tier')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const current = (data?.season_peak_tier as Record<string, string>) ?? {};
        const updated = { ...current, [String(currentSeason.id)]: newTier };
        supabase!
          .from('profiles')
          .update({ season_peak_tier: updated })
          .eq('id', user!.id)
          .then(() => {})
          .catch(() => {});
      })
      .catch(() => {});
  }, [isAuthenticated, user?.id, currentSeason.id]);

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
