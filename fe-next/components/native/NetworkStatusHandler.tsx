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

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isNative } from '@/utils/platform';
import { isOfflineCapable } from '@/lib/offline/offlineCapableModes';
import { OfflineFallback } from './OfflineFallback';
import posthog from '@/lib/analytics/lazyPosthog';

interface NetworkStatusHandlerProps {
  children: React.ReactNode;
}

export function NetworkStatusHandler({ children }: NetworkStatusHandlerProps): React.ReactElement {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const [isRetrying, setIsRetrying] = useState(false);

  const showFallback = !isOnline && isNative() && !isOfflineCapable(pathname ?? '');

  // Rage clicks on the retry button (reach=7 on ru/multiplayer, 2026-10-24 brief) had no
  // signal to distinguish "stays offline" from "reloads but can't reach the server" —
  // this pins the retry outcome down for the next lane to diagnose.
  useEffect(() => {
    if (showFallback) {
      posthog.capture('app_offline_fallback_shown', { pathname });
    }
  }, [showFallback, pathname]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    posthog.capture('app_offline_retry_clicked', { pathname });

    // Attempt to reload the page
    window.location.reload();
  }, [pathname]);

  if (showFallback) {
    return <OfflineFallback onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  return <>{children}</>;
}
