'use client';

import { useEffect } from 'react';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { useNetworkState } from '@/hooks/useNetworkState';
import { getOfflineStore } from '@/lib/offline';
import { prefetchDailyPuzzles } from '@/lib/offline/prefetchDaily';

interface Options {
  language: string;
}

export function usePrefetchDailyContent({ language }: Options): void {
  const offlineFlag = useOfflineModeFlag();
  const { online } = useNetworkState();

  useEffect(() => {
    if (!offlineFlag || !online) return;
    getOfflineStore()
      .then((store) => prefetchDailyPuzzles({ language, store }))
      .catch(() => { /* best-effort — silently ignore */ });
  }, [offlineFlag, online, language]);
}
