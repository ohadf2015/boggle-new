/**
 * NativeAppProvider component
 *
 * Initializes native app features:
 * - Safe area CSS variables (via useSafeArea hook)
 * - App lifecycle monitoring (foreground/background)
 * - Socket reconnection on foreground
 */

'use client';

import React from 'react';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import logger from '@/utils/logger';

interface NativeAppProviderProps {
  children: React.ReactNode;
}

export function NativeAppProvider({ children }: NativeAppProviderProps): React.ReactElement {
  // Initialize safe area CSS variables (no-op on web)
  // Hook sets --cap-safe-area-top/bottom/left/right on document root
  useSafeArea();

  // Handle app lifecycle transitions
  useAppLifecycle({
    onForeground: () => {
      logger.log('[NativeAppProvider] App came to foreground');

      // Reconnect socket if disconnected
      const socket = getSharedSocketIfExists();
      if (socket && !socket.connected) {
        logger.log('[NativeAppProvider] Reconnecting socket after foreground');
        socket.connect();
      }
    },
    onBackground: () => {
      logger.log('[NativeAppProvider] App went to background');
      // Note: We don't disconnect socket on background
      // iOS/Android will handle connection appropriately
    },
  });

  return <>{children}</>;
}
