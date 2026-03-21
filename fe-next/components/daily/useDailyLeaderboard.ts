'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DailyParticipant } from './DailyLeaderboard';
import type { Language } from '@/types';

interface UseDailyLeaderboardOptions {
  puzzleDate: string;
  language: Language;
  gameType: 'puzzle' | 'wordHunt';
  onParticipantCountChange?: (count: number) => void;
}

interface DailyLeaderboardState {
  participants: DailyParticipant[];
  totalCount: number;
  totalAttempts: number;
  guestPlayerCount: number;
  loading: boolean;
  error: string | null;
  fetchLeaderboard: () => Promise<void>;
}

/**
 * Hook that fetches and polls the daily leaderboard.
 * Pauses polling when the tab is hidden and resumes on visibility.
 */
export function useDailyLeaderboardData({
  puzzleDate,
  language,
  gameType,
  onParticipantCountChange,
}: UseDailyLeaderboardOptions): DailyLeaderboardState {
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [guestPlayerCount, setGuestPlayerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const basePath = gameType === 'wordHunt'
        ? `/api/daily-challenge/word-hunt/leaderboard`
        : `/api/daily-challenge/leaderboard`;
      const url = `${basePath}/${puzzleDate}/${language}?limit=50`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Leaderboard API error:', response.status, errorText);
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('Leaderboard data:', { url, date: puzzleDate, language, gameType, participants: data.data?.length, total: data.totalParticipants });
      }
      setParticipants(data.data || []);
      setTotalCount(data.totalParticipants || 0);
      setTotalAttempts(data.totalAttempts || 0);
      setGuestPlayerCount(data.guestPlayerCount || 0);

      if (onParticipantCountChange) {
        onParticipantCountChange(data.totalParticipants || 0);
      }
    } catch (err) {
      console.error('Failed to fetch daily leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [puzzleDate, language, onParticipantCountChange, gameType]);

  // Initial fetch and polling — pauses when tab is hidden
  useEffect(() => {
    fetchLeaderboard();

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(fetchLeaderboard, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchLeaderboard();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLeaderboard]);

  return { participants, totalCount, totalAttempts, guestPlayerCount, loading, error, fetchLeaderboard };
}
