/**
 * useDailyChallengeStatus Hook
 *
 * React hook for pre-fetching daily challenge status.
 * Used by landing page to show streak and completion status before user enters.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { prefetchDailyStatus, getQuickDailyStatus } from '@/utils/dailyChallenge/prefetch';
import type { DailyChallengeStatus } from '@/utils/playerStats/types';
import type { Language } from '@/types';

interface UseDailyChallengeStatusReturn extends DailyChallengeStatus {
  /** Force refresh status from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to pre-fetch daily challenge status
 *
 * Strategy:
 * 1. Immediately return localStorage data (for fast initial render)
 * 2. For authenticated users, fetch from server in background
 * 3. Server data updates state when available
 * 4. Auto-refreshes on window focus/visibility changes
 *
 * @param language - The game language to check status for
 * @returns Daily challenge status with refresh function
 *
 * @example
 * const { hasPlayed, hasSolved, currentStreak, loading, refresh } = useDailyChallengeStatus('en');
 */
export function useDailyChallengeStatus(language: Language): UseDailyChallengeStatusReturn {
  const { user } = useAuth();
  const playerId = user?.id ?? null;

  // Initialize with localStorage data for immediate display
  const [status, setStatus] = useState<DailyChallengeStatus>(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return {
        hasPlayed: false,
        hasSolved: null,
        currentStreak: 0,
        longestStreak: 0,
        puzzleNumber: 0,
        puzzleDate: '',
        loading: true,
        fromServer: false,
      };
    }
    return {
      ...getQuickDailyStatus(language),
      loading: !!playerId, // Only loading if we'll fetch from server
    };
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Track if we're currently fetching to prevent duplicate requests
  const isFetching = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const newStatus = await prefetchDailyStatus(language, playerId);

      if (isMounted.current) {
        setStatus(newStatus);
      }
    } finally {
      isFetching.current = false;
    }
  }, [language, playerId]);

  // Initial load
  useEffect(() => {
    isMounted.current = true;

    // Set initial localStorage data immediately
    const quickStatus = getQuickDailyStatus(language);
    setStatus({
      ...quickStatus,
      loading: !!playerId,
    });

    // Fetch from server if authenticated
    if (playerId) {
      fetchStatus();
    }

    return () => {
      isMounted.current = false;
    };
  }, [language, playerId, fetchStatus]);

  // Auto-refresh on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Debounce to avoid rapid refreshes
        const timer = setTimeout(() => {
          if (isMounted.current) {
            // Quick update from localStorage first
            const quickStatus = getQuickDailyStatus(language);
            setStatus((prev) => ({
              ...prev,
              ...quickStatus,
              loading: !!playerId,
            }));

            // Then fetch from server if authenticated
            if (playerId) {
              fetchStatus();
            }
          }
        }, 500);

        return () => clearTimeout(timer);
      }
      return undefined;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [language, playerId, fetchStatus]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      // Debounce to avoid rapid refreshes
      const timer = setTimeout(() => {
        if (isMounted.current) {
          // Quick update from localStorage first
          const quickStatus = getQuickDailyStatus(language);
          setStatus((prev) => ({
            ...prev,
            ...quickStatus,
            loading: !!playerId,
          }));

          // Then fetch from server if authenticated
          if (playerId) {
            fetchStatus();
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [language, playerId, fetchStatus]);

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    await fetchStatus();
  }, [fetchStatus]);

  return {
    ...status,
    refresh,
  };
}
