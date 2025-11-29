'use client';

/**
 * React Hooks for Supabase Real-time Subscriptions
 * Provides easy-to-use hooks for live data updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToLeaderboard,
  subscribeToProfile,
  subscribeToGameResults,
  createGameRoomChannel
} from '../lib/supabaseRealtime';
import {
  leaderboardOperations,
  profileOperations,
  gameResultsOperations
} from '../lib/supabaseEnhanced';
import logger from '@/utils/logger';

interface LeaderboardOptions {
  limit?: number;
  orderBy?: string;
  enabled?: boolean;
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

interface ProfileResult {
  profile: any;
  loading: boolean;
  error: any;
  updateProfile: (updates: any) => Promise<any>;
  refetch: () => Promise<void>;
}

interface GameHistoryOptions {
  limit?: number;
}

interface GameHistoryResult {
  history: any[];
  loading: boolean;
  error: any;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

interface PlayerSearchOptions {
  debounce?: number;
  limit?: number;
  minLength?: number;
}

interface PlayerSearchResult {
  query: string;
  results: any[];
  loading: boolean;
  error: any;
  search: (newQuery: string) => void;
}

interface GameRoomResult {
  players: Record<string, any>;
  broadcast: (event: string, data: any) => void;
  isConnected: boolean;
}

interface ConnectionHealth {
  isHealthy: boolean;
  latency: number | null;
  lastCheck: string | null;
  error?: any;
  check: () => Promise<any>;
}

/**
 * Hook for live leaderboard updates
 * @param options - { limit, orderBy, enabled }
 * @returns { data, loading, error, refetch }
 */
export function useLeaderboard(options: LeaderboardOptions = {}): LeaderboardResult {
  const { limit = 100, orderBy = 'total_score', enabled = true } = options;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('disconnected');

  const fetchLeaderboard = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    const result = await leaderboardOperations.getTop(limit, orderBy);

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data || []);
      setError(null);
    }
    setLoading(false);
  }, [limit, orderBy, enabled]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeToLeaderboard(
      (payload) => {
        // On any change, refetch to ensure correct order
        fetchLeaderboard();
      },
      {
        onStatusChange: setSubscriptionStatus
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, fetchLeaderboard]);

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
 * @param userId - User ID
 * @returns { rank, loading, error }
 */
export function useUserRank(userId: string | null | undefined): UserRankResult {
  const [rank, setRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchRank = useCallback(async () => {
    if (!userId) {
      setRank(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await leaderboardOperations.getUserRank(userId);

    if (result.error) {
      setError(result.error);
    } else {
      setRank(result.data?.[0] || null);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRank();
  }, [fetchRank]);

  // Subscribe to leaderboard changes to update rank
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToLeaderboard(() => {
      fetchRank();
    });

    return () => {
      unsubscribe();
    };
  }, [userId, fetchRank]);

  return { rank, loading, error, refetch: fetchRank };
}

/**
 * Hook for live profile updates
 * @param userId - User ID
 * @returns { profile, loading, error, updateProfile }
 */
export function useProfile(userId: string | null | undefined): ProfileResult {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await profileOperations.get(userId);

    if (result.error) {
      setError(result.error);
    } else {
      setProfile(result.data);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Subscribe to profile changes
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToProfile(userId, (newProfile) => {
      setProfile(newProfile);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const updateProfile = useCallback(async (updates: any) => {
    if (!userId) return { error: { message: 'No user ID' } };

    const result = await profileOperations.update(userId, updates);
    if (!result.error && result.data) {
      setProfile(result.data);
    }
    return result;
  }, [userId]);

  return { profile, loading, error, updateProfile, refetch: fetchProfile };
}

/**
 * Hook for game history with live updates
 * @param userId - User ID
 * @param options - { limit, offset }
 * @returns { history, loading, error, hasMore, loadMore }
 */
export function useGameHistory(userId: string | null | undefined, options: GameHistoryOptions = {}): GameHistoryResult {
  const { limit = 20 } = options;

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (currentOffset = 0, append = false) => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await gameResultsOperations.getHistory(userId, limit, currentOffset);

    if (result.error) {
      setError(result.error);
    } else {
      const newData = result.data || [];
      setHistory(prev => append ? [...prev, ...newData] : newData);
      setHasMore(newData.length === limit);
      setError(null);
    }
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    setOffset(0);
    fetchHistory(0, false);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to new game results
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToGameResults(userId, (newResult) => {
      setHistory(prev => [newResult, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchHistory(newOffset, true);
    }
  }, [loading, hasMore, offset, limit, fetchHistory]);

  return {
    history,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => {
      setOffset(0);
      fetchHistory(0, false);
    }
  };
}

/**
 * Hook for player search
 * @param initialQuery - Search query
 * @param options - { debounce, limit, minLength }
 * @returns { results, loading, error, search }
 */
export function usePlayerSearch(initialQuery = '', options: PlayerSearchOptions = {}): PlayerSearchResult {
  const { debounce = 300, limit = 20, minLength = 2 } = options;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query || query.length < minLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    timeoutRef.current = setTimeout(async () => {
      const result = await leaderboardOperations.searchPlayers(query, limit);

      if (result.error) {
        setError(result.error);
        setResults([]);
      } else {
        setResults(result.data || []);
        setError(null);
      }
      setLoading(false);
    }, debounce);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounce, limit, minLength]);

  return { query, results, loading, error, search };
}

/**
 * Hook for game room presence and broadcast
 * @param gameCode - Game room code
 * @param userData - Current user data for presence
 * @returns { players, broadcast, isConnected }
 */
export function useGameRoom(gameCode: string | null | undefined, userData: any = null): GameRoomResult {
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!gameCode) return;

    const channel = createGameRoomChannel(gameCode, {
      onPresence: (state: any, event: any) => {
        if (state) {
          setPlayers(state);
        } else if (event) {
          // Handle join/leave events
          logger.log('[GameRoom] Presence event:', event);
        }
      },
      onBroadcast: (payload: any) => {
        logger.log('[GameRoom] Broadcast received:', payload);
      }
    });

    channelRef.current = channel;
    setIsConnected(true);

    // Track user presence if userData provided
    if (userData) {
      channel.track(userData);
    }

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [gameCode, userData]);

  const broadcast = useCallback((event: string, data: any) => {
    if (channelRef.current) {
      return channelRef.current.broadcast(event, data);
    }
  }, []);

  return { players, broadcast, isConnected };
}

/**
 * Hook for connection health monitoring
 * @param interval - Check interval in ms
 * @returns { isHealthy, latency, lastCheck, check }
 */
export function useConnectionHealth(interval = 30000): ConnectionHealth {
  const [health, setHealth] = useState<Omit<ConnectionHealth, 'check'>>({
    isHealthy: true,
    latency: null,
    lastCheck: null
  });

  const { connectionMonitor } = require('../lib/supabaseEnhanced');

  const checkHealth = useCallback(async () => {
    const result = await connectionMonitor.checkHealth();
    setHealth({
      isHealthy: result.healthy,
      latency: result.latency,
      lastCheck: new Date().toISOString(),
      error: result.error
    });
    return result;
  }, []);

  useEffect(() => {
    checkHealth();

    if (interval > 0) {
      const timer = setInterval(checkHealth, interval);
      return () => clearInterval(timer);
    }
  }, [interval, checkHealth]);

  return { ...health, check: checkHealth };
}
