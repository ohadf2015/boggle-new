/**
 * App Lifecycle Hook
 * Provides callbacks for app foreground/background transitions on native.
 * Uses globalThis.Capacitor to avoid any @capacitor/* imports that break Turbopack.
 */

import { useEffect, useRef } from 'react';
import { isNative } from '../utils/platform';

interface UseAppLifecycleOptions {
  onForeground?: () => void;
  onBackground?: () => void;
}

export function useAppLifecycle({
  onForeground,
  onBackground,
}: UseAppLifecycleOptions): void {
  const onForegroundRef = useRef(onForeground);
  const onBackgroundRef = useRef(onBackground);

  useEffect(() => {
    onForegroundRef.current = onForeground;
    onBackgroundRef.current = onBackground;
  }, [onForeground, onBackground]);

  useEffect(() => {
    if (!isNative()) return;

    // Access Capacitor plugins via globalThis to avoid static imports

    const cap = (globalThis as any).Capacitor;
    // Guard against the Android WebView race: isNativePlatform() can flip true
    // before the native bridge has registered @capacitor/app, surfacing as
    // "App plugin is not implemented on android" (Sentry JAVASCRIPT-NEXTJS-12A).
    if (typeof cap?.isPluginAvailable === 'function' && !cap.isPluginAvailable('App')) return;
    const AppPlugin = cap?.Plugins?.App;
    if (!AppPlugin) return;

    let listenerHandle: { remove: () => void } | null = null;
    let removed = false;

    Promise.resolve(AppPlugin.addListener('appStateChange', (state: { isActive: boolean }) => {
      try {
        if (state.isActive) {
          onForegroundRef.current?.();
        } else {
          onBackgroundRef.current?.();
        }
      } catch (error) {
        console.error('App lifecycle callback error:', error);
      }
    })).then((handle: { remove: () => void }) => {
      if (removed) {
        handle.remove();
      } else {
        listenerHandle = handle;
      }
    }).catch((error: unknown) => {
      // UNIMPLEMENTED when native bridge hasn't bound App plugin yet (remote WebView load race).
      // Non-actionable: plugin IS registered in capacitor.plugins.json; downgrade to debug.
      console.debug('App lifecycle listener unavailable:', error);
    });

    return () => {
      removed = true;
      try { listenerHandle?.remove(); } catch {}
    };
  }, []);
}
