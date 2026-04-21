/**
 * NativeAppProvider component
 *
 * Initializes native app features:
 * - Safe area CSS variables (via useSafeArea hook)
 * - App lifecycle monitoring (foreground/background)
 * - Socket reconnection on foreground
 */

'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { isNative } from '@/utils/platform';
import logger from '@/utils/logger';

const DeepLinkHandler = dynamic(() => import('@/components/DeepLinkHandler'), { ssr: false });
const NativeColdStartGuard = dynamic(() => import('./NativeColdStartGuard'), { ssr: false });

interface NativeAppProviderProps {
  children: React.ReactNode;
}

export function NativeAppProvider({ children }: NativeAppProviderProps): React.ReactElement {
  // Initialize safe area CSS variables (no-op on web)
  // Hook sets --cap-safe-area-top/bottom/left/right on document root
  useSafeArea();

  // Configure status bar on native: don't overlay WebView content
  useEffect(() => {
    if (!isNative()) return;

    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      // Let WebView render behind the status bar — CSS safe area vars handle the inset
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#1a1a2e' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      logger.log('[NativeAppProvider] Status bar configured');
    }).catch((err) => {
      logger.warn('[NativeAppProvider] Failed to configure status bar:', err);
    });
  }, []);

  // Hide the splash screen as soon as React has mounted the first frame.
  // Capacitor's `launchAutoHide` fires after a fixed duration regardless of
  // whether the WebView has finished loading the remote URL, which leaves
  // Android users on a black WebView when the 301→locale redirect is slow.
  useEffect(() => {
    if (!isNative()) return;

    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      SplashScreen.hide().catch(() => {
        // Splash already hidden or plugin unavailable — safe to ignore
      });
    }).catch((err) => {
      logger.warn('[NativeAppProvider] Failed to hide splash screen:', err);
    });
  }, []);

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

  return (
    <>
      <NativeColdStartGuard />
      <DeepLinkHandler />
      {children}
    </>
  );
}
