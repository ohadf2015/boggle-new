'use client';

import { useState, useEffect } from 'react';

interface UseViewportTrackingReturn {
  viewportHeight: number;
  isVeryShortLandscape: boolean;
  isExtremelyShortLandscape: boolean;
}

/**
 * Hook for tracking viewport height for responsive landscape adjustments
 */
export function useViewportTracking(isLandscape: boolean): UseViewportTrackingReturn {
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const updateHeight = (): void => setViewportHeight(window.innerHeight);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  const isVeryShortLandscape = isLandscape && viewportHeight > 0 && viewportHeight < 400;
  const isExtremelyShortLandscape = isLandscape && viewportHeight > 0 && viewportHeight < 350;

  return {
    viewportHeight,
    isVeryShortLandscape,
    isExtremelyShortLandscape,
  };
}
