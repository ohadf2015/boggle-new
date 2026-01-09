'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseTvFullscreenOptions {
  /** Whether fullscreen functionality is enabled */
  enabled?: boolean;
  /** Callback when fullscreen state changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

interface UseTvFullscreenReturn {
  /** Whether currently in fullscreen mode */
  isFullscreen: boolean;
  /** Toggle fullscreen mode */
  toggleFullscreen: () => void;
  /** Enter fullscreen mode */
  enterFullscreen: () => void;
  /** Exit fullscreen mode */
  exitFullscreen: () => void;
  /** Whether fullscreen is supported by the browser */
  isSupported: boolean;
}

/**
 * useTvFullscreen - Hook for managing fullscreen mode in TV broadcast view
 * Handles browser Fullscreen API with cross-browser support
 */
export function useTvFullscreen({
  enabled = true,
  onFullscreenChange,
}: UseTvFullscreenOptions = {}): UseTvFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  // Check if fullscreen is supported
  const isSupported = typeof document !== 'undefined' &&
    (document.fullscreenEnabled ||
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     (document as any).webkitFullscreenEnabled ||
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     (document as any).mozFullScreenEnabled ||
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     (document as any).msFullscreenEnabled);

  // Get the fullscreen element (cross-browser)
  const getFullscreenElement = useCallback((): Element | null => {
    if (typeof document === 'undefined') return null;
    return (
      document.fullscreenElement ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).webkitFullscreenElement ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).mozFullScreenElement ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).msFullscreenElement ||
      null
    );
  }, []);

  // Update state based on actual fullscreen status
  const updateFullscreenState = useCallback(() => {
    const isCurrentlyFullscreen = getFullscreenElement() !== null;
    setIsFullscreen(isCurrentlyFullscreen);
    onFullscreenChange?.(isCurrentlyFullscreen);
  }, [getFullscreenElement, onFullscreenChange]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!enabled || !isSupported) return;

    const element = containerRef.current || document.documentElement;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((element as any).webkitRequestFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (element as any).webkitRequestFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((element as any).mozRequestFullScreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (element as any).mozRequestFullScreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((element as any).msRequestFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, [enabled, isSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!enabled) return;

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).webkitExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document as any).webkitExitFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).mozCancelFullScreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document as any).mozCancelFullScreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).msExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, [enabled]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];

    events.forEach(event => {
      document.addEventListener(event, updateFullscreenState);
    });

    // Initial state check
    updateFullscreenState();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateFullscreenState);
      });
    };
  }, [updateFullscreenState]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isSupported,
  };
}

export default useTvFullscreen;
