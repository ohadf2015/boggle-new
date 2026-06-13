'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import logger from '@/utils/logger';
import { fetchWithAuth } from '@/utils/authFetch';

interface BadgeInfo {
  id: string;
  name_key: string;
  icon: string;
  image_url: string | null;
  rarity: string;
}

interface GiftMessage {
  id: string;
  title: string;
  message: string;
  template_type: string | null;
  xp_amount: number;
  coin_amount: number;
  badge_id?: string | null;
  badge?: BadgeInfo | null;
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
  const queryClient = useQueryClient();
  const [gifts, setGifts] = useState<GiftMessage[]>([]);
  const [unclaimedCount, setUnclaimedCount] = useState(0);

  // Track locally claimed gift IDs to preserve claimed status during refresh
  const locallyClaimedIdsRef = useRef<Set<string>>(new Set());
  // Track whether we have loaded the full gift list (once loaded, derive count from gifts)
  const giftsLoadedRef = useRef(false);

  // Save to localStorage cache
  const setCachedCount = useCallback((count: number) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ count, timestamp: Date.now() }));
    } catch { /* Ignore cache errors */ }
  }, []);

  // Query: unclaimed count
  const countQuery = useQuery({
    queryKey: queryKeys.gifts.unclaimedCount(),
    queryFn: async () => {
      const response = await fetch('/api/player/gifts/unclaimed-count');
      if (response.status === 401) return { count: 0 };
      if (!response.ok) throw new Error('Failed to fetch unclaimed count');
      return response.json() as Promise<{ count: number }>;
    },
    enabled: isAuthenticated,
    staleTime: CACHE_DURATION,
    refetchInterval: CACHE_DURATION,
    placeholderData: () => {
      // Use localStorage as placeholder
      if (typeof window === 'undefined') return undefined;
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { count, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) return { count };
        }
      } catch { /* ignore */ }
      return undefined;
    },
  });

  // Sync count query into local state + localStorage (skip if gifts already loaded locally)
  useEffect(() => {
    if (giftsLoadedRef.current) return; // gifts effect manages count after first load
    const count = countQuery.data?.count ?? 0;
    setUnclaimedCount(count);
    if (countQuery.data) setCachedCount(count);
  }, [countQuery.data, setCachedCount]);

  // Query: full gift list (only when count > 0)
  const giftsQuery = useQuery({
    queryKey: queryKeys.gifts.list(),
    queryFn: async () => {
      const response = await fetchWithAuth('/api/player/gifts');
      if (response.status === 401) return { gifts: [] };
      if (!response.ok) throw new Error('Failed to fetch gifts');
      return response.json() as Promise<{ gifts: GiftMessage[] }>;
    },
    enabled: isAuthenticated && unclaimedCount > 0,
    staleTime: CACHE_DURATION,
  });

  // Merge fetched gifts with locally claimed state
  useEffect(() => {
    const fetchedGifts = giftsQuery.data?.gifts ?? [];
    if (fetchedGifts.length === 0 && !giftsQuery.data) return;
    giftsLoadedRef.current = true;
    const unclaimedOnly = fetchedGifts.filter(g => !g.claimed);
    const mergedGifts = unclaimedOnly.map(g => {
      if (locallyClaimedIdsRef.current.has(g.id)) {
        return { ...g, claimed: true, claimed_at: g.claimed_at || new Date().toISOString() };
      }
      return g;
    });
    setGifts(mergedGifts);
    const unclaimed = mergedGifts.filter(g => !g.claimed).length;
    setUnclaimedCount(unclaimed);
    setCachedCount(unclaimed);
  }, [giftsQuery.data, setCachedCount]);

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async (giftId: string) => {
      const response = await fetch(`/api/player/gifts/${giftId}/claim`, { method: 'POST' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to claim gift');
      }
      return { giftId, ...(await response.json()) as { xpAwarded: number; coinsAwarded: number } };
    },
    onSuccess: ({ giftId }) => {
      locallyClaimedIdsRef.current.add(giftId);
      setGifts(prev => prev.map(g =>
        g.id === giftId ? { ...g, claimed: true, claimed_at: new Date().toISOString() } : g
      ));
      setUnclaimedCount(prev => {
        const next = Math.max(0, prev - 1);
        setCachedCount(next);
        return next;
      });
    },
    onError: (err) => {
      logger.error('useUnclaimedGifts: claim failed', err);
    },
  });

  const claimGift = useCallback(async (giftId: string) => {
    const result = await claimMutation.mutateAsync(giftId);
    return { xpAwarded: result.xpAwarded || 0, coinsAwarded: result.coinsAwarded || 0 };
  }, [claimMutation]);

  const refresh = useCallback(async () => {
    if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
    await queryClient.invalidateQueries({ queryKey: queryKeys.gifts._def });
  }, [queryClient]);

  // Reset when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnclaimedCount(0);
      setGifts([]);
      giftsLoadedRef.current = false;
      locallyClaimedIdsRef.current = new Set();
    }
  }, [isAuthenticated]);

  const loading = countQuery.isLoading || giftsQuery.isLoading;
  const error = countQuery.error?.message ?? giftsQuery.error?.message ?? null;

  return {
    unclaimedCount,
    gifts,
    loading,
    error,
    refresh,
    claimGift,
  };
}
