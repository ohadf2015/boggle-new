'use client';

import { useState, useEffect } from 'react';

/**
 * useTvFullscreenListener - Listens for TV fullscreen mode changes
 * This hook allows components to react to fullscreen state changes from the TV broadcast view
 *
 * @returns {boolean} isFullscreen - Whether TV fullscreen mode is currently active
 */
export function useTvFullscreenListener(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFullscreenChange = (event: CustomEvent<{ isFullscreen: boolean }>) => {
      setIsFullscreen(event.detail.isFullscreen);
    };

    // Also check the document fullscreen state directly for initial state
    const checkFullscreenState = () => {
      const fullscreenElement = document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement;

      setIsFullscreen(!!fullscreenElement);
    };

    // Listen for custom TV fullscreen events
    window.addEventListener('tvFullscreenChange', handleFullscreenChange as EventListener);

    // Also listen for native fullscreen change events
    document.addEventListener('fullscreenchange', checkFullscreenState);
    document.addEventListener('webkitfullscreenchange', checkFullscreenState);
    document.addEventListener('mozfullscreenchange', checkFullscreenState);
    document.addEventListener('MSFullscreenChange', checkFullscreenState);

    // Check initial state
    checkFullscreenState();

    return () => {
      window.removeEventListener('tvFullscreenChange', handleFullscreenChange as EventListener);
      document.removeEventListener('fullscreenchange', checkFullscreenState);
      document.removeEventListener('webkitfullscreenchange', checkFullscreenState);
      document.removeEventListener('mozfullscreenchange', checkFullscreenState);
      document.removeEventListener('MSFullscreenChange', checkFullscreenState);
    };
  }, []);

  return isFullscreen;
}

export default useTvFullscreenListener;
