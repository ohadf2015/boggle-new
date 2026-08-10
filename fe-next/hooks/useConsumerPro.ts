'use client';

/**
 * Client-side hook for Consumer Pro subscription status.
 * Calls the API route to check the current user's consumer subscription.
 * Caches the result in-memory for the session so we don't hammer the DB.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface UseConsumerProReturn {
  /** Whether the user has an active Consumer Pro subscription. */
  hasConsumerPro: boolean;
  /** True while the initial check is loading. */
  isLoading: boolean;
  /** Error message from the check, if any. */
  error: string | null;
  /** Re-fetch the subscription status (e.g. after a purchase). */
  refresh: () => void;
}

// In-memory cache so multiple hook instances share one fetch per session.
const cache = new Map<string, boolean>();

export function useConsumerPro(): UseConsumerProReturn {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [hasConsumerPro, setHasConsumerPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);

  const fetchStatus = useCallback(() => {
    if (!user?.id || !isAuthenticated) {
      setHasConsumerPro(false);
      setIsLoading(false);
      return;
    }

    // Check in-memory cache
    if (cache.has(user.id)) {
      setHasConsumerPro(cache.get(user.id)!);
      setIsLoading(false);
      return;
    }

    const thisFetch = ++fetchRef.current;
    setIsLoading(true);
    setError(null);

    fetch(`/api/subscription/consumer?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to check subscription');
        return res.json() as Promise<{ hasConsumerPro: boolean }>;
      })
      .then((data) => {
        if (thisFetch !== fetchRef.current) return; // stale
        cache.set(user.id, data.hasConsumerPro);
        setHasConsumerPro(data.hasConsumerPro);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (thisFetch !== fetchRef.current) return;
        console.error('[useConsumerPro] Check failed:', err);
        setError(err.message);
        setHasConsumerPro(false);
        setIsLoading(false);
      });
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    fetchStatus();
  }, [authLoading, fetchStatus]);

  const refresh = useCallback(() => {
    if (user?.id) cache.delete(user.id);
    fetchStatus();
  }, [user?.id, fetchStatus]);

  return {
    hasConsumerPro,
    isLoading,
    error,
    refresh,
  };
}