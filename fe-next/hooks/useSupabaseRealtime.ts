'use client';

/**
 * React Hooks for Supabase Real-time Subscriptions
 * Provides easy-to-use hooks for live data updates
 *
 * Optimizations:
 * - Stable callback references to prevent subscription churn
 * - Debounced refetches to prevent API flooding
 * - Efficient dependency tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToLeaderboard
} from '../lib/supabaseRealtime';
import {
  leaderboardOperations
} from '../lib/supabaseEnhanced';
import { useMounted } from '@/hooks/useMounted';

/**
 * Hook to create a debounced callback
 */
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on every render
  callbackRef.current = callback;

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

interface LeaderboardOptions {
  limit?: number;
  orderBy?: string;
  enabled?: boolean;
  debounceMs?: number; // Debounce delay for realtime refetches (default: 500ms)
}

interface LeaderboardResult {
  data: any[];
  loading: boolean;
  error: any;
  subscriptionStatus: string;
  refetch: () => Promise<void>;
}

interface UserRankResult {
  rank: any;
  loading: boolean;
  error: any;
  refetch: () => Promise<void>;
}

// Removed unused type definitions for removed hooks

/**
 * Hook for live leaderboard updates
 * Uses singleton subscription pattern - multiple instances share the same WebSocket
 *
 * @param options - { limit, orderBy, enabled, debounceMs }
 * @returns { data, loading, error, subscriptionStatus, refetch }
 */
export function useLeaderboard(options: LeaderboardOptions = {}): LeaderboardResult {
  const { limit = 100, orderBy = 'total_score', enabled = true, debounceMs = 500 } = options;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('disconnected');

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useMounted();

  const fetchLeaderboard = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    const result = await leaderboardOperations.getTop(limit, orderBy);

    if (!isMountedRef.current) return;

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data || []);
      setError(null);
    }
    setLoading(false);
  }, [limit, orderBy, enabled]);

  // Debounced refetch for realtime updates
  const debouncedRefetch = useDebouncedCallback(fetchLeaderboard, debounceMs);

  // Trigger initial fetch - using void to acknowledge fire-and-forget pattern
  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Stable callback ref for subscription to prevent re-subscriptions
  const onRealtimeUpdateRef = useRef(debouncedRefetch);
  onRealtimeUpdateRef.current = debouncedRefetch;

  useEffect(() => {
    if (!enabled) return;

    // Use stable callback via ref to prevent subscription churn
    const handleUpdate = () => {
      onRealtimeUpdateRef.current();
    };

    const unsubscribe = subscribeToLeaderboard(
      handleUpdate,
      {
        onStatusChange: setSubscriptionStatus
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled]); // Only re-subscribe when enabled changes

  return {
    data,
    loading,
    error,
    subscriptionStatus,
    refetch: fetchLeaderboard
  };
}

/**
 * Hook for user rank with live updates
 * Shares the singleton leaderboard subscription with useLeaderboard
 *
 * @param userId - User ID
 * @returns { rank, loading, error, refetch }
 */
export function useUserRank(userId: string | null | undefined): UserRankResult {
  const [rank, setRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Track if component is mounted
  const isMountedRef = useMounted();

  const fetchRank = useCallback(async () => {
    if (!userId) {
      setRank(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await leaderboardOperations.getUserRank(userId);

    if (!isMountedRef.current) return;

    if (result.error) {
      setError(result.error);
    } else {
      setRank(result.data?.[0] || null);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  // Debounced refetch for realtime updates (500ms default)
  const debouncedRefetch = useDebouncedCallback(fetchRank, 500);

  useEffect(() => {
    void fetchRank();
  }, [fetchRank]);

  // Stable callback ref to prevent subscription churn
  const onRealtimeUpdateRef = useRef(debouncedRefetch);
  onRealtimeUpdateRef.current = debouncedRefetch;

  // Subscribe to leaderboard changes to update rank (shares singleton channel)
  useEffect(() => {
    if (!userId) return;

    const handleUpdate = () => {
      onRealtimeUpdateRef.current();
    };

    const unsubscribe = subscribeToLeaderboard(handleUpdate);

    return () => {
      unsubscribe();
    };
  }, [userId]); // Only re-subscribe when userId changes

  return { rank, loading, error, refetch: fetchRank };
}

// Removed unused hooks: useProfile, useGameHistory, usePlayerSearch, useGameRoom, useConnectionHealth
// These were never imported or used anywhere in the codebase
