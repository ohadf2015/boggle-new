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
import { useWebViewRepaintOnResume } from '@/hooks/useWebViewRepaintOnResume';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useStatusBarTint } from '@/hooks/useStatusBarTint';
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

  // Hardware back gesture/button -> Next.js router back, with double-tap-to-exit
  // on root routes. Replaces Capacitor's default exitApp-on-back behavior.
  useAndroidBackButton();

  // Per-route status bar color so the system bar matches the active mode's
  // brand family (multiplayer=pink, daily=yellow, etc). Applies on every nav.
  useStatusBarTint();

  // Repaint the WebView on resume. After a fullscreen ad Activity (interstitial
  // / rewarded) dismisses, the WebView can return to the foreground without
  // re-acquiring its GPU surface — a blank frame over the live React tree ("ad
  // shows, then blank page"). Kicking a repaint on the actual resume catches the
  // case the per-ad Dismissed-listener kick can miss (rAF still throttled then).
  useWebViewRepaintOnResume();

  // One-time status bar wiring: WebView extends behind the bar, safe-area CSS
  // vars handle the inset. Color/style set per-route by useStatusBarTint.
  useEffect(() => {
    if (!isNative()) return;
    import('@capacitor/status-bar').then(({ StatusBar }) => {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      logger.log('[NativeAppProvider] Status bar overlay enabled');
    }).catch((err) => {
      logger.warn('[NativeAppProvider] Failed to configure status bar overlay:', err);
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
