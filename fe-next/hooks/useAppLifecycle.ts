/**
 * App Lifecycle Hook
 * Provides callbacks for app foreground/background transitions on native.
 * Capacitor is dynamically imported to avoid Turbopack SWC helper errors.
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

    let removed = false;
    let removeListener: (() => void) | null = null;

    const registerListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('appStateChange', (state) => {
          try {
            if (state.isActive) {
              onForegroundRef.current?.();
            } else {
              onBackgroundRef.current?.();
            }
          } catch (error) {
            console.error('App lifecycle callback error:', error);
          }
        });
        if (removed) {
          listener.remove();
        } else {
          removeListener = () => listener.remove();
        }
      } catch (error) {
        console.error('Failed to register app lifecycle listener:', error);
      }
    };

    registerListener();

    return () => {
      removed = true;
      try { removeListener?.(); } catch {}
    };
  }, []);
}
