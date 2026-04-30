/**
 * useNativeAppStatePause
 *
 * Bridges Capacitor's `App.appStateChange` to background/foreground callbacks.
 * iOS WKWebView fires `visibilitychange` inconsistently when the user swipes
 * to the app switcher, takes a call, or pulls Control Center — Capacitor's
 * native lifecycle event is the authoritative signal.
 *
 * Web is a no-op: consumers keep their existing `visibilitychange` listeners
 * for browser tab focus. This hook is *additive* on native, never replaces.
 *
 * Lazy-imports `@capacitor/app` only on `isNative()` to keep the web bundle clean
 * (mirrors `HapticsManager` precedent).
 */

import { useEffect } from 'react';
import { isNative } from '@/utils/platform';

interface PluginListenerHandle {
  remove: () => Promise<void>;
}

interface UseNativeAppStatePauseOptions {
  onBackground?: () => void;
  onForeground?: () => void;
}

export function useNativeAppStatePause({
  onBackground,
  onForeground,
}: UseNativeAppStatePauseOptions): void {
  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    let handle: PluginListenerHandle | null = null;

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        if (cancelled) return;
        handle = await App.addListener('appStateChange', (state: { isActive: boolean }) => {
          if (state.isActive) {
            onForeground?.();
          } else {
            onBackground?.();
          }
        });
      } catch {
        // Capacitor App plugin unavailable — silent fail (web-fallback paths active)
      }
    })();

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, [onBackground, onForeground]);
}
