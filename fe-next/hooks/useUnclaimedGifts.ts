'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GiftMessage {
  id: string;
  title: string;
  message: string;
  template_type: string | null;
  xp_amount: number;
  coin_amount: number;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  sender?: {
    username: string;
    display_name: string | null;
  };
}

interface UseUnclaimedGiftsReturn {
  unclaimedCount: number;
  gifts: GiftMessage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  claimGift: (giftId: string) => Promise<{ xpAwarded: number; coinsAwarded: number }>;
}

const CACHE_KEY = 'lexiclash_unclaimed_gifts_count';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to manage unclaimed admin gifts for the current user
 * - Fetches unclaimed gift count on mount
 * - Caches count to avoid excessive API calls
 * - Provides methods to refresh and claim gifts
 */
export function useUnclaimedGifts(): UseUnclaimedGiftsReturn {
  const { isAuthenticated } = useAuth();
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [gifts, setGifts] = useState<GiftMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check cached count
  const getCachedCount = useCallback((): number | null => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return count;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  }, []);

  // Save to cache
  const setCachedCount = useCallback((count: number) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        count,
        timestamp: Date.now(),
      }));
    } catch (e) {
      // Ignore cache errors
    }
  }, []);

  // Fetch unclaimed count from API
  const fetchUnclaimedCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnclaimedCount(0);
      setGifts([]);
      return;
    }

    // Check cache first
    const cached = getCachedCount();
    if (cached !== null) {
      setUnclaimedCount(cached);
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/player/gifts/unclaimed-count');

      if (!response.ok) {
        if (response.status === 401) {
          setUnclaimedCount(0);
          return;
        }
        throw new Error('Failed to fetch unclaimed count');
      }

      const data = await response.json();
      setUnclaimedCount(data.count || 0);
      setCachedCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching unclaimed gifts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getCachedCount, setCachedCount]);

  // Fetch full gift list
  const fetchGifts = useCallback(async () => {
    if (!isAuthenticated) {
      setGifts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/player/gifts');

      if (!response.ok) {
        if (response.status === 401) {
          setGifts([]);
          return;
        }
        throw new Error('Failed to fetch gifts');
      }

      const data = await response.json();
      setGifts(data.gifts || []);

      // Update unclaimed count from actual list
      const unclaimed = (data.gifts || []).filter((g: GiftMessage) => !g.claimed).length;
      setUnclaimedCount(unclaimed);
      setCachedCount(unclaimed);
    } catch (err) {
      console.error('Error fetching gifts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setCachedCount]);

  // Claim a gift
  const claimGift = useCallback(async (giftId: string): Promise<{ xpAwarded: number; coinsAwarded: number }> => {
    const response = await fetch(`/api/player/gifts/${giftId}/claim`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to claim gift');
    }

    const result = await response.json();

    // Update local state
    setGifts(prev => prev.map(g =>
      g.id === giftId ? { ...g, claimed: true, claimed_at: new Date().toISOString() } : g
    ));
    setUnclaimedCount(prev => Math.max(0, prev - 1));
    setCachedCount(Math.max(0, unclaimedCount - 1));

    return {
      xpAwarded: result.xpAwarded || 0,
      coinsAwarded: result.coinsAwarded || 0,
    };
  }, [unclaimedCount, setCachedCount]);

  // Refresh function
  const refresh = useCallback(async () => {
    // Clear cache to force fresh fetch
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
    await fetchGifts();
  }, [fetchGifts]);

  // Initial fetch - when count is loaded and > 0, also fetch full gifts
  useEffect(() => {
    fetchUnclaimedCount();
  }, [fetchUnclaimedCount]);

  // When unclaimed count > 0 and gifts array is empty, fetch full gifts
  // This ensures gifts are available when user clicks the gift button
  useEffect(() => {
    if (unclaimedCount > 0 && gifts.length === 0 && !loading) {
      fetchGifts();
    }
  }, [unclaimedCount, gifts.length, loading, fetchGifts]);

  // Poll for new gifts every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchUnclaimedCount();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnclaimedCount]);

  return {
    unclaimedCount,
    gifts,
    loading,
    error,
    refresh,
    claimGift,
  };
}
