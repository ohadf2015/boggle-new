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

// Module-level cache for leaderboard data (stale-while-revalidate pattern)
// Persists across component mounts/unmounts for instant subsequent loads
const leaderboardCache: {
  data: any[] | null;
  timestamp: number;
  key: string;
} = { data: null, timestamp: 0, key: '' };

const userRankCache: Map<string, { data: any; timestamp: number }> = new Map();

const CACHE_TTL_MS = 60_000; // 1 minute - serve cached data immediately, revalidate in background

/**
 * Hook for live leaderboard updates
 * Uses singleton subscription pattern - multiple instances share the same WebSocket
 * Implements stale-while-revalidate caching for instant page loads
 *
 * @param options - { limit, orderBy, enabled, debounceMs }
 * @returns { data, loading, error, subscriptionStatus, refetch }
 */
export function useLeaderboard(options: LeaderboardOptions = {}): LeaderboardResult {
  const { limit = 100, orderBy = 'total_score', enabled = true, debounceMs = 500 } = options;

  const cacheKey = `${limit}:${orderBy}`;
  const cached = leaderboardCache.key === cacheKey ? leaderboardCache.data : null;
  // Initialize with cached data if available (instant render)
  const [data, setData] = useState<any[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('disconnected');

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useMounted();

  const fetchLeaderboard = useCallback(async () => {
    if (!enabled) return;

    // Only show loading spinner if we have no cached data
    if (!leaderboardCache.data || leaderboardCache.key !== cacheKey) {
      setLoading(true);
    }
    const result = await leaderboardOperations.getTop(limit, orderBy);

    if (!isMountedRef.current) return;

    if (result.error) {
      setError(result.error);
    } else {
      const freshData = result.data || [];
      setData(freshData);
      setError(null);
      // Update module-level cache
      leaderboardCache.data = freshData;
      leaderboardCache.timestamp = Date.now();
      leaderboardCache.key = cacheKey;
    }
    setLoading(false);
  }, [limit, orderBy, enabled, isMountedRef, cacheKey]);

  // Debounced refetch for realtime updates
  const debouncedRefetch = useDebouncedCallback(fetchLeaderboard, debounceMs);

  // Trigger initial fetch - skip if cache is fresh, revalidate in background if stale
  useEffect(() => {
    const cachedEntry = leaderboardCache.key === cacheKey ? leaderboardCache.data : null;
    const isFresh = cachedEntry && (Date.now() - leaderboardCache.timestamp) < CACHE_TTL_MS;
    if (isFresh) {
      // Cache is fresh, skip fetch
      setLoading(false);
      return;
    }
    void fetchLeaderboard();
  }, [fetchLeaderboard, cacheKey]);

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
  const cachedRank = userId ? userRankCache.get(userId) : null;
  const isCachedRankFresh = () => cachedRank && (Date.now() - cachedRank.timestamp) < CACHE_TTL_MS;

  const [rank, setRank] = useState<any>(cachedRank?.data || null);
  const [loading, setLoading] = useState(!cachedRank);
  const [error, setError] = useState<any>(null);

  // Track if component is mounted
  const isMountedRef = useMounted();

  const fetchRank = useCallback(async () => {
    if (!userId) {
      setRank(null);
      setLoading(false);
      return;
    }

    if (!userRankCache.has(userId)) {
      setLoading(true);
    }
    const result = await leaderboardOperations.getUserRank(userId);

    if (!isMountedRef.current) return;

    if (result.error) {
      setError(result.error);
    } else {
      const freshRank = result.data?.[0] || null;
      setRank(freshRank);
      setError(null);
      userRankCache.set(userId, { data: freshRank, timestamp: Date.now() });
    }
    setLoading(false);
  }, [userId, isMountedRef]);

  // Debounced refetch for realtime updates (500ms default)
  const debouncedRefetch = useDebouncedCallback(fetchRank, 500);

  useEffect(() => {
    if (isCachedRankFresh()) {
      setLoading(false);
      return;
    }
    void fetchRank();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
