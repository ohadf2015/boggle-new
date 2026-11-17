'use client';

import { useEffect } from 'react';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useAuth } from '@/contexts/AuthContext';
import { getOfflineStore } from '@/lib/offline';
import { prefetchDailyPuzzles } from '@/lib/offline/prefetchDaily';
import { getWithAuth } from '@/utils/authFetch';

interface Options {
  language: string;
}

const fetchWithSession = (url: string) => getWithAuth(url);

/**
 * Caches today's (and, late in the day, tomorrow's) daily puzzle into the
 * offline store so a rider can play the Daily Challenge with no connection.
 *
 * Intentionally NOT gated by the `offline-mode` flag: caching a puzzle is a
 * harmless best-effort IndexedDB write (the flag guards the heavier score-sync
 * + banner subsystem). The store is opened lazily and the prefetch is throttled
 * to once per 6h, so the cost lands once per session on whoever opens Daily.
 */
export function usePrefetchDailyContent({ language }: Options): void {
  const { online } = useNetworkState();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const enabled = online && !authLoading && isAuthenticated;

  useEffect(() => {
    if (!enabled) return;
    getOfflineStore()
      .then((store) => prefetchDailyPuzzles({ language, store, _fetchFn: fetchWithSession as typeof fetch }))
      .catch(() => { /* best-effort — silently ignore */ });
  }, [enabled, language]);
}
