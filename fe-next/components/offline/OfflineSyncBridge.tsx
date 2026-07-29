'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineSyncBridge(): null {
  useOfflineSync();
  return null;
}
