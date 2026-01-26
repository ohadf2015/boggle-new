/**
 * App Lifecycle Hook
 * Provides callbacks for app foreground/background transitions on native
 */

import { useEffect, useRef } from 'react';
import { App, type PluginListenerHandle } from '@capacitor/app';
import { isNative } from '../utils/platform';

interface UseAppLifecycleOptions {
  /**
   * Callback fired when app comes to foreground (becomes active)
   */
  onForeground?: () => void;

  /**
   * Callback fired when app goes to background (becomes inactive)
   */
  onBackground?: () => void;
}

/**
 * Hook to listen for app lifecycle events (foreground/background)
 * Only active in native environment, no-op on web
 *
 * @param options - Lifecycle callbacks
 *
 * @example
 * useAppLifecycle({
 *   onForeground: () => console.log('App active'),
 *   onBackground: () => console.log('App inactive')
 * });
 */
export function useAppLifecycle({
  onForeground,
  onBackground,
}: UseAppLifecycleOptions): void {
  // Use refs to always access latest callback
  const onForegroundRef = useRef(onForeground);
  const onBackgroundRef = useRef(onBackground);

  // Update refs when callbacks change
  useEffect(() => {
    onForegroundRef.current = onForeground;
    onBackgroundRef.current = onBackground;
  }, [onForeground, onBackground]);

  useEffect(() => {
    // Only register listeners in native environment
    if (!isNative()) {
      return;
    }

    let listener: PluginListenerHandle | null = null;

    try {
      listener = App.addListener('appStateChange', (state) => {
        try {
          if (state.isActive) {
            onForegroundRef.current?.();
          } else {
            onBackgroundRef.current?.();
          }
        } catch (error) {
          // Silently catch callback errors to prevent crash
          console.error('App lifecycle callback error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to register app lifecycle listener:', error);
    }

    // Cleanup listener on unmount
    return () => {
      try {
        listener?.remove();
      } catch (error) {
        console.error('Failed to remove app lifecycle listener:', error);
      }
    };
  }, []); // Empty deps - only run once, use refs for latest callbacks
}
