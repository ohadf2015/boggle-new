'use client';

import { useState, useEffect, useCallback } from 'react';

// Desktop detection thresholds
const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_MIN_HEIGHT = 700;
const TV_MIN_WIDTH = 1920;
const TV_MIN_HEIGHT = 1000;

// CrazyGames minimum thresholds
const CRAZYGAMES_MIN_WIDTH = 821;
const CRAZYGAMES_MIN_HEIGHT = 462;

/**
 * Layout type based on screen dimensions
 */
export type LayoutType = 'mobile' | 'tablet' | 'desktop' | 'tv';

/**
 * Detailed layout information
 */
interface LayoutInfo {
  /** Current layout type */
  type: LayoutType;
  /** Whether the screen is in desktop mode (width >= 1024, height >= 700) */
  isDesktop: boolean;
  /** Whether the screen is in TV mode (width >= 1920) */
  isTv: boolean;
  /** Whether the screen is in tablet mode (768-1023px width) */
  isTablet: boolean;
  /** Whether the screen is in mobile mode (< 768px width) */
  isMobile: boolean;
  /** Whether this is a tall screen (height >= 800px) */
  isTallScreen: boolean;
  /** Whether this is a wide screen (width >= 1.5 * height) */
  isWideScreen: boolean;
  /** Whether the viewport meets CrazyGames minimum (821x462) */
  meetsCrazyGamesMin: boolean;
  /** Current viewport width */
  width: number;
  /** Current viewport height */
  height: number;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
}

/**
 * Options for the useDesktopLayout hook
 */
interface UseDesktopLayoutOptions {
  /** Custom minimum width for desktop detection (default: 1024) */
  desktopMinWidth?: number;
  /** Custom minimum height for desktop detection (default: 700) */
  desktopMinHeight?: number;
  /** Debounce resize events in ms (default: 100) */
  debounceMs?: number;
}

/**
 * Hook to detect desktop layout mode and provide detailed screen information.
 *
 * Use this hook to:
 * - Show/hide desktop-specific UI elements
 * - Enable keyboard shortcuts on desktop
 * - Adjust layouts for larger screens
 * - Optimize for TV displays
 *
 * @example
 * ```tsx
 * const { isDesktop, isTv, type } = useDesktopLayout();
 *
 * return (
 *   <div>
 *     {isDesktop && <DesktopSidebar />}
 *     {isTv && <TvOptimizedGrid />}
 *   </div>
 * );
 * ```
 */
// Stable default used for SSR *and* the client's first render. Reading window in
// the useState initializer would make the desktop client's first render diverge
// from this server value → React #418 tree regeneration in any consumer that
// branches on the layout. The mount effect syncs the real viewport.
const SSR_DEFAULT_LAYOUT: LayoutInfo = {
  type: 'mobile',
  isDesktop: false,
  isTv: false,
  isTablet: false,
  isMobile: true,
  isTallScreen: false,
  isWideScreen: false,
  meetsCrazyGamesMin: false,
  width: 375,
  height: 667,
  aspectRatio: 375 / 667,
};

export function useDesktopLayout(options: UseDesktopLayoutOptions = {}): LayoutInfo {
  const {
    desktopMinWidth = DESKTOP_MIN_WIDTH,
    desktopMinHeight = DESKTOP_MIN_HEIGHT,
    debounceMs = 100,
  } = options;

  const calculateLayout = useCallback((): LayoutInfo => {
    // Default to mobile for SSR
    if (typeof window === 'undefined') {
      return SSR_DEFAULT_LAYOUT;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;

    // Calculate layout type
    const isTv = width >= TV_MIN_WIDTH && height >= TV_MIN_HEIGHT;
    const isDesktop = !isTv && width >= desktopMinWidth && height >= desktopMinHeight;
    const isTablet = !isTv && !isDesktop && width >= 768;
    const isMobile = !isTv && !isDesktop && !isTablet;

    // Additional info
    const isTallScreen = height >= 800;
    const isWideScreen = aspectRatio >= 1.5;
    const meetsCrazyGamesMin = width >= CRAZYGAMES_MIN_WIDTH && height >= CRAZYGAMES_MIN_HEIGHT;

    // Determine type
    let type: LayoutType = 'mobile';
    if (isTv) type = 'tv';
    else if (isDesktop) type = 'desktop';
    else if (isTablet) type = 'tablet';

    return {
      type,
      isDesktop,
      isTv,
      isTablet,
      isMobile,
      isTallScreen,
      isWideScreen,
      meetsCrazyGamesMin,
      width,
      height,
      aspectRatio,
    };
  }, [desktopMinWidth, desktopMinHeight]);

  // Start from the SSR default so the first client render matches the server;
  // the effect below immediately syncs the real viewport on mount.
  const [layout, setLayout] = useState<LayoutInfo>(SSR_DEFAULT_LAYOUT);

  useEffect(() => {
    // Initial calculation after mount
    setLayout(calculateLayout());

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setLayout(calculateLayout());
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, [calculateLayout, debounceMs]);

  return layout;
}

/**
 * Simplified hook that just returns boolean for desktop detection
 * @returns true if screen is in desktop mode
 */
export function useIsDesktop(): boolean {
  const { isDesktop } = useDesktopLayout();
  return isDesktop;
}

/**
 * Simplified hook that just returns boolean for TV detection
 * @returns true if screen is in TV mode
 */
export function useIsTv(): boolean {
  const { isTv } = useDesktopLayout();
  return isTv;
}

export default useDesktopLayout;
