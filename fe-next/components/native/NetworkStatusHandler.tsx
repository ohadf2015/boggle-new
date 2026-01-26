/**
 * NetworkStatusHandler component
 *
 * Monitors network status and shows offline fallback in native environment.
 * Web browsers have their own offline indicators, so only activates in native.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isNative } from '@/utils/platform';
import { OfflineFallback } from './OfflineFallback';

interface NetworkStatusHandlerProps {
  children: React.ReactNode;
}

export function NetworkStatusHandler({ children }: NetworkStatusHandlerProps): React.ReactElement {
  const isOnline = useOnlineStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);

    // Attempt to reload the page
    window.location.reload();
  }, []);

  // Only show offline fallback in native environment
  // Web browsers have their own offline indicators
  if (!isOnline && isNative()) {
    return <OfflineFallback onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  return <>{children}</>;
}
