'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { throttle } from '@/utils/throttle';

/**
 * Hook to detect mobile landscape mode
 * Returns true when on mobile/tablet in landscape orientation
 * Threshold: window.innerWidth > window.innerHeight && window.innerHeight <= 600
 *
 * Performance: Uses throttled resize listener (100ms) to prevent jank on low-end devices
 */
export function useMobileLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(false);
  const throttledCheckRef = useRef<ReturnType<typeof throttle> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLandscape = () => {
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      const isMobileHeight = window.innerHeight <= 600;
      setIsLandscape(isLandscapeMode && isMobileHeight);
    };

    // Create throttled version (100ms) to prevent excessive updates during resize
    const throttledCheck = throttle(checkLandscape, 100);
    throttledCheckRef.current = throttledCheck;

    // Initial check (not throttled)
    checkLandscape();

    window.addEventListener('resize', throttledCheck);
    window.addEventListener('orientationchange', checkLandscape); // Orientation change should be immediate

    return () => {
      window.removeEventListener('resize', throttledCheck);
      window.removeEventListener('orientationchange', checkLandscape);
      throttledCheck.cancel();
    };
  }, []);

  return isLandscape;
}
