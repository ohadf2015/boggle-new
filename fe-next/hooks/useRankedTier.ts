/**
 * useRankedTier Hook
 *
 * Fetches the current user's ranked rating from the player_ratings table.
 * Computes tier, progress to next tier, peak rating, and season info.
 * Falls back to profile.ranked_mmr if no player_ratings row exists.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getTierFromElo,
  getTierProgress,
  getNextTier,
  getSeasonNumber,
  getDaysUntilSeasonEnd,
  type RankedTier,
} from '@/lib/ranked/tiers';

export interface UseRankedTierReturn {
  tier: RankedTier;
  tierInfo: RankedTier;
  rating: number;
  peakRating: number;
  progress: number;
  gamesPlayed: number;
  loading: boolean;
  /** Backward-compatible aliases */
  elo: number;
  nextTier: RankedTier | null;
  season: number;
  daysRemaining: number;
}

export function useRankedTier(overrideElo?: number): UseRankedTierReturn {
  const { user, profile } = useAuth();
  const fallbackElo = overrideElo ?? (profile as unknown as Record<string, unknown>)?.ranked_mmr as number ?? 0;

  const [ratingRow, setRatingRow] = useState<{
    rating: number;
    peakRating: number;
    gamesPlayed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchRating = useCallback(async () => {
    if (!user?.id || !supabase || overrideElo !== undefined) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select('rating, peak_rating, games_played, wins, losses')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setRatingRow(null);
      } else {
        const row = data as Record<string, unknown>;
        setRatingRow({
          rating: (row.rating as number) ?? 0,
          peakRating: (row.peak_rating as number) ?? (row.rating as number) ?? 0,
          gamesPlayed: (row.games_played as number) ??
            ((row.wins as number) ?? 0) + ((row.losses as number) ?? 0),
        });
      }
    } catch {
      setRatingRow(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, overrideElo]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchRating();
  }, [fetchRating]);

  const rating = ratingRow?.rating ?? fallbackElo;

  return useMemo(() => {
    const tier = getTierFromElo(rating);
    return {
      tier,
      tierInfo: tier,
      rating,
      peakRating: ratingRow?.peakRating ?? rating,
      progress: getTierProgress(rating),
      gamesPlayed: ratingRow?.gamesPlayed ?? 0,
      loading,
      // Backward-compatible
      elo: rating,
      nextTier: getNextTier(rating),
      season: getSeasonNumber(),
      daysRemaining: getDaysUntilSeasonEnd(),
    };
  }, [rating, ratingRow, loading]);
}
