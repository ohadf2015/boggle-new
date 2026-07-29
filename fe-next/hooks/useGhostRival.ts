'use client';

/**
 * useGhostRival Hook
 * Fetches the player's weekly ghost rival data via API.
 * Returns rival info, scores, gap, and countdown.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface GhostRivalData {
  rival: {
    id: string;
    username: string;
    avatar: string;
    score: number;
  } | null;
  player: { score: number };
  gap: number;
  isAhead: boolean;
  loading: boolean;
  error: string | null;
  weekEnd: string | null;
  refresh: () => void;
}

export function useGhostRival(): GhostRivalData {
  const { user } = useAuth();
  const [rival, setRival] = useState<GhostRivalData['rival']>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [weekEnd, setWeekEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRival = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ghost-rival?userId=${encodeURIComponent(user.id)}`
      );
      if (!res.ok) throw new Error('Failed to fetch ghost rival');

      const data = await res.json();
      setRival(data.rival ?? null);
      setPlayerScore(data.player?.score ?? 0);
      setWeekEnd(data.weekEnd ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRival();
  }, [fetchRival]);

  const rivalScore = rival?.score ?? 0;
  const gap = Math.abs(playerScore - rivalScore);
  const isAhead = playerScore >= rivalScore;

  return {
    rival,
    player: { score: playerScore },
    gap,
    isAhead,
    loading,
    error,
    weekEnd,
    refresh: fetchRival,
  };
}
