'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Device type based on viewport dimensions
 */
export type CrazyGamesDeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Viewport information for CrazyGames iframe embedding
 */
export interface CrazyGamesViewportInfo {
  /** True if running in iframe (window.parent !== window) */
  isIframeEmbed: boolean;
  /** Current viewport dimensions (iframe size when embedded) */
  viewportSize: { width: number; height: number };
  /** Whether viewport is landscape orientation */
  isLandscape: boolean;
  /** Device type based on iframe viewport size */
  deviceType: CrazyGamesDeviceType;
}

// Breakpoints matching useDesktopLayout.ts
const TABLET_MIN_WIDTH = 768;
const TABLET_MAX_WIDTH = 1023;

/**
 * Utility to get device type from viewport dimensions
 * Can be used outside React components
 */
export function getCrazyGamesDeviceType(width: number = typeof window !== 'undefined' ? window.innerWidth : 768): CrazyGamesDeviceType {
  if (width < TABLET_MIN_WIDTH) {
    return 'mobile';
  }
  if (width <= TABLET_MAX_WIDTH) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Hook for CrazyGames-specific viewport handling
 *
 * Provides accurate viewport information when running in iframe embedding.
 * Uses window.innerWidth/innerHeight which correctly reports iframe dimensions.
 *
 * @example
 * ```tsx
 * const { isIframeEmbed, deviceType, isLandscape } = useCrazyGamesViewport();
 *
 * // Use deviceType to determine layout (based on iframe size, not parent window)
 * if (deviceType === 'mobile') {
 *   // Show mobile layout
 * }
 * ```
 */
export function useCrazyGamesViewport(): CrazyGamesViewportInfo {
  const calculateViewportInfo = useCallback((): CrazyGamesViewportInfo => {
    // SSR default
    if (typeof window === 'undefined') {
      return {
        isIframeEmbed: false,
        viewportSize: { width: 768, height: 1024 },
        isLandscape: false,
        deviceType: 'tablet',
      };
    }

    // Detect iframe embedding
    const isIframeEmbed = window.parent !== window;

    // Use window.innerWidth/innerHeight - works correctly in iframes
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Determine orientation
    const isLandscape = width > height;

    // Classify device type based on iframe viewport size
    const deviceType = getCrazyGamesDeviceType(width);

    return {
      isIframeEmbed,
      viewportSize: { width, height },
      isLandscape,
      deviceType,
    };
  }, []);

  // Use SSR-safe default for initial render to prevent hydration mismatch.
  // The useEffect below updates to real viewport dimensions after mount.
  const [viewportInfo, setViewportInfo] = useState<CrazyGamesViewportInfo>({
    isIframeEmbed: false,
    viewportSize: { width: 768, height: 1024 },
    isLandscape: false,
    deviceType: 'tablet',
  });

  useEffect(() => {
    // Calculate real viewport on mount (after hydration)
    setViewportInfo(calculateViewportInfo());

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events (100ms like useDesktopLayout)
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewportInfo(calculateViewportInfo());
      }, 100);
    };

    // Listen for resize events
    // CrazyGames may resize iframe based on their UI state
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [calculateViewportInfo]);

  return viewportInfo;
}
