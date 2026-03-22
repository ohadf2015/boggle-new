'use client';

/**
 * useLeagueRivals Hook
 * Fetches the 2 players directly above and below in league standings
 */

import { useState, useEffect, useCallback } from 'react';

export interface LeagueRival {
  username: string;
  avatar: string;
  score: number;
  position: number;
}

export interface LeagueRivalsData {
  above: LeagueRival | null;
  below: LeagueRival | null;
  player: { position: number; score: number } | null;
  loading: boolean;
}

export function useLeagueRivals(userId: string | null): LeagueRivalsData {
  const [above, setAbove] = useState<LeagueRival | null>(null);
  const [below, setBelow] = useState<LeagueRival | null>(null);
  const [player, setPlayer] = useState<{ position: number; score: number } | null>(null);
  const [loading, setLoading] = useState(!!userId);

  const fetchRivals = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/leagues/rivals?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch rivals');

      const data = await res.json();
      setAbove(data.above ?? null);
      setBelow(data.below ?? null);
      setPlayer(data.player ?? null);
    } catch {
      setAbove(null);
      setBelow(null);
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRivals();
  }, [fetchRivals]);

  return { above, below, player, loading };
}
