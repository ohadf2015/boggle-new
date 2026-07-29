'use client';

import { useState, useEffect, useRef } from 'react';
import { throttle } from '@/utils/throttle';

/**
 * Hook to detect mobile portrait mode
 * Returns true when on mobile (< 640px width) in portrait orientation
 *
 * Performance: Uses throttled resize listener (100ms) to prevent jank on low-end devices
 */
export function useMobilePortrait(): boolean {
  // Start false so SSR (no window) and the client's FIRST render agree — reading
  // innerWidth in the initializer diverges from SSR on mobile-portrait viewports
  // and triggers React #418 tree regeneration. The effect below syncs the real
  // value post-mount (the SSR HTML already paints the non-portrait layout, so no
  // added flash — only the mismatch is removed).
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const throttledCheckRef = useRef<ReturnType<typeof throttle> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPortrait = () => {
      const isPortrait = window.innerWidth <= window.innerHeight;
      const isMobileWidth = window.innerWidth < 640; // Tailwind sm breakpoint
      setIsMobilePortrait(isPortrait && isMobileWidth);
    };

    // Create throttled version (100ms) to prevent excessive updates during resize
    const throttledCheck = throttle(checkPortrait, 100);
    throttledCheckRef.current = throttledCheck;

    // Initial check (not throttled)
    checkPortrait();

    window.addEventListener('resize', throttledCheck);
    window.addEventListener('orientationchange', checkPortrait); // Orientation change should be immediate

    return () => {
      window.removeEventListener('resize', throttledCheck);
      window.removeEventListener('orientationchange', checkPortrait);
      throttledCheck.cancel();
    };
  }, []);

  return isMobilePortrait;
}
