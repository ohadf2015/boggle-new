'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { getOfflineStore } from '@/lib/offline';
import { syncQueueViaApi } from '@/lib/offline/sync';

export function useOfflineSync(): void {
  const offlineFlag = useOfflineModeFlag();
  const { online } = useNetworkState();
  const { t } = useLanguageSafe();

  const wasOfflineRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!offlineFlag) return;

    if (!online) {
      wasOfflineRef.current = true;
      return;
    }

    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    void (async () => {
      try {
        const store = await getOfflineStore();
        const summary = await syncQueueViaApi(store);

        if (summary.accepted > 0) {
          toast.success(t('offline.sync.adjusted').replace('{count}', String(summary.accepted)));
        }
        if (summary.rejectedWordCount > 0) {
          toast.info(t('offline.sync.adjusted'));
        }
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [offlineFlag, online, t]);
}
