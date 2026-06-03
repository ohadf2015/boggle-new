/**
 * NetworkStatusHandler component
 *
 * Monitors network status in the native app. When offline, it gates by ROUTE:
 *  - offline-capable modes (Blast / Connections / Daily) keep rendering so the
 *    player can still play with no network (data is bundled + offline dict +
 *    queued score sync).
 *  - everything else falls back to OfflineFallback (server-only routes).
 *
 * Web browsers have their own offline indicators, so the fallback only ever
 * activates in native.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isNative } from '@/utils/platform';
import { isOfflineCapable } from '@/lib/offline/offlineCapableModes';
import { OfflineFallback } from './OfflineFallback';

interface NetworkStatusHandlerProps {
  children: React.ReactNode;
}

export function NetworkStatusHandler({ children }: NetworkStatusHandlerProps): React.ReactElement {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);

    // Attempt to reload the page
    window.location.reload();
  }, []);

  // Native + offline: only wall off routes that genuinely need the server.
  // Offline-capable modes keep rendering so play continues uninterrupted.
  if (!isOnline && isNative() && !isOfflineCapable(pathname ?? '')) {
    return <OfflineFallback onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  return <>{children}</>;
}
