'use client';

import { useState, useEffect } from 'react';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { isNative } from '@/utils/platform';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const DEFAULT_INSETS: SafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

/**
 * useSafeArea - Get device safe area insets
 *
 * Uses capacitor-plugin-safe-area on native platforms to get
 * accurate insets for notched devices (iPhone X+, Android cutouts).
 * Returns zero insets on web.
 *
 * Also sets CSS custom properties for use in stylesheets:
 * - --cap-safe-area-top
 * - --cap-safe-area-bottom
 * - --cap-safe-area-left
 * - --cap-safe-area-right
 *
 * @example
 * const insets = useSafeArea();
 * // { top: 47, bottom: 34, left: 0, right: 0 }
 *
 * // In styles
 * paddingTop: insets.top,
 */
export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(DEFAULT_INSETS);

  useEffect(() => {
    // Only fetch on native platforms
    if (!isNative()) {
      return;
    }

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    // Set CSS custom properties
    const updateCSSProperties = (newInsets: SafeAreaInsets) => {
      document.documentElement.style.setProperty('--cap-safe-area-top', `${newInsets.top}px`);
      document.documentElement.style.setProperty('--cap-safe-area-bottom', `${newInsets.bottom}px`);
      document.documentElement.style.setProperty('--cap-safe-area-left', `${newInsets.left}px`);
      document.documentElement.style.setProperty('--cap-safe-area-right', `${newInsets.right}px`);
    };

    // Initial fetch
    SafeArea.getSafeAreaInsets()
      .then(({ insets: fetchedInsets }) => {
        setInsets(fetchedInsets);
        updateCSSProperties(fetchedInsets);
      })
      .catch((error) => {
        console.warn('Failed to get safe area insets:', error);
        // Keep default zero insets
      });

    // Listen for changes (e.g., orientation change)
    SafeArea.addListener('safeAreaChanged', ({ insets: newInsets }) => {
      setInsets(newInsets);
      updateCSSProperties(newInsets);
    }).then((handle) => {
      listenerHandle = handle;
    }).catch((error) => {
      console.warn('Failed to register safe area listener:', error);
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return insets;
}

export default useSafeArea;
