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

// capacitor-plugin-safe-area on Android 15+ occasionally returns a bottom inset
// that double-counts system bars (300+px) when the AdMob banner attaches. Letting
// that through inflates GlobalBottomNav.paddingBottom so the tabs land mid-screen
// with a same-color (bg-neo-navy) band below — visible as "dead space". Largest
// legitimate inset on any shipped device: Dynamic Island top ≈ 59px, landscape
// notch ≈ 47px, iPhone home-indicator = 34px, Android gesture nav ≤ 48px. 96px
// gives ~30% headroom; anything past that is a plugin bug — drop to 0 (system
// bar may slightly overlap content, far better than half-screen nav).
const MAX_PLAUSIBLE_INSET_PX = 96;
const sanitize = (n: number): number => (n > MAX_PLAUSIBLE_INSET_PX ? 0 : n);
const sanitizeInsets = (raw: SafeAreaInsets): SafeAreaInsets => ({
  top: sanitize(raw.top),
  bottom: sanitize(raw.bottom),
  left: sanitize(raw.left),
  right: sanitize(raw.right),
});

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
        const clean = sanitizeInsets(fetchedInsets);
        setInsets(clean);
        updateCSSProperties(clean);
      })
      .catch(() => {
        // Plugin unavailable — keep default zero insets (expected when capacitor-plugin-safe-area not registered)
      });

    // Listen for changes (e.g., orientation change)
    Promise.resolve(SafeArea.addListener('safeAreaChanged', ({ insets: newInsets }) => {
      const clean = sanitizeInsets(newInsets);
      setInsets(clean);
      updateCSSProperties(clean);
    })).then((handle) => {
      listenerHandle = handle;
    }).catch(() => {
      // Listener unavailable — safe to ignore
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
