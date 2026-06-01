'use client';

/**
 * useLeague Hook
 * Fetches and manages the player's weekly league state
 */

import { useState, useEffect, useCallback } from 'react';

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'ruby';
export type LeagueZone = 'promotion' | 'safe' | 'relegation';

export interface LeagueStanding {
  userId: string;
  displayName: string;
  weeklyXp: number;
  position: number;
  zone: LeagueZone;
}

export interface LeagueData {
  leagueId: string;
  tier: LeagueTier;
  standings: LeagueStanding[];
  myPosition: number | null;
  myXp: number;
  promotionZone: number; // Top N positions that promote
  relegationZone: number; // Bottom N positions that relegate
  /** ISO timestamp when the current weekly league closes (promotion/relegation). */
  weekEnd: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const PROMOTION_COUNT = 10;
const RELEGATION_COUNT = 5;

export function useLeague(userId: string | null): LeagueData {
  const [leagueId, setLeagueId] = useState<string>('');
  const [tier, setTier] = useState<LeagueTier>('bronze');
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [weekEnd, setWeekEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeague = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leagues/my-league?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch league');

      const data = await res.json();
      setLeagueId(data.leagueId ?? '');
      setTier(data.tier ?? 'bronze');
      setStandings(data.standings ?? []);
      setWeekEnd(data.weekEnd ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLeague();
  }, [fetchLeague]);

  const myStanding = standings.find((s) => s.userId === userId);

  return {
    leagueId,
    tier,
    standings,
    myPosition: myStanding?.position ?? null,
    myXp: myStanding?.weeklyXp ?? 0,
    promotionZone: PROMOTION_COUNT,
    relegationZone: RELEGATION_COUNT,
    weekEnd,
    isLoading,
    error,
    refresh: fetchLeague,
  };
}
