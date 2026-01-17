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
    !!(document.fullscreenEnabled ||
     (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
     (document as Document & { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
     (document as Document & { msFullscreenEnabled?: boolean }).msFullscreenEnabled);

  // Get the fullscreen element (cross-browser)
  const getFullscreenElement = useCallback((): Element | null => {
    if (typeof document === 'undefined') return null;
    type FullscreenDocument = Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };
    const doc = document as FullscreenDocument;
    return doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement || null;
  }, []);

  // Update state based on actual fullscreen status
  const updateFullscreenState = useCallback(() => {
    const isCurrentlyFullscreen = getFullscreenElement() !== null;
    setIsFullscreen(isCurrentlyFullscreen);
    onFullscreenChange?.(isCurrentlyFullscreen);

    // Dispatch global event for layout components to react to fullscreen changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tvFullscreenChange', {
        detail: { isFullscreen: isCurrentlyFullscreen }
      }));
    }
  }, [getFullscreenElement, onFullscreenChange]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!enabled || !isSupported) return;

    const element = containerRef.current || document.documentElement;
    type FullscreenElement = HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    const el = element as FullscreenElement;

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, [enabled, isSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!enabled) return;

    type FullscreenDocument = Document & {
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };
    const doc = document as FullscreenDocument;

    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
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
