'use client';

import { useEffect } from 'react';
import { useNetworkState } from '@/hooks/useNetworkState';
import { getOfflineStore } from '@/lib/offline';
import { prefetchDailyPuzzles } from '@/lib/offline/prefetchDaily';

interface Options {
  language: string;
}

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

  useEffect(() => {
    if (!online) return;
    getOfflineStore()
      .then((store) => prefetchDailyPuzzles({ language, store }))
      .catch(() => { /* best-effort — silently ignore */ });
  }, [online, language]);
}
