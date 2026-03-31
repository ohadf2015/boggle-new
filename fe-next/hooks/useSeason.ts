'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getSeasonTimeRemaining());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const updatePeakTier = useCallback((elo: number) => {
    const tier = getRankTier(elo);
    setPeakTier((prev) => {
      if (tierRank(tier.name) > tierRank(prev)) {
        localStorage.setItem(peakKey, tier.name);
        return tier.name;
      }
      return prev;
    });
  }, [peakKey]);

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
