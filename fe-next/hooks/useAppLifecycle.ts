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
     
    const plugins = (globalThis as any).Capacitor?.Plugins;
    const AppPlugin = plugins?.App;
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
      console.error('Failed to register app lifecycle listener:', error);
    });

    return () => {
      removed = true;
      try { listenerHandle?.remove(); } catch {}
    };
  }, []);
}
