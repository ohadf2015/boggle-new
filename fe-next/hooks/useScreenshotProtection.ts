'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect when the page loses visibility/focus for screenshot protection.
 *
 * This helps prevent casual screenshot sharing by:
 * - Detecting when user switches tabs (visibilitychange)
 * - Detecting when browser window loses focus (blur)
 *
 * Note: This is a deterrent, not foolproof protection. Dedicated users can still
 * capture the screen using system tools, external cameras, or by disabling JS.
 *
 * @returns {isProtected: boolean, protectionReason: string | null}
 */
export function useScreenshotProtection() {
  const [isProtected, setIsProtected] = useState(false);
  const [protectionReason, setProtectionReason] = useState<string | null>(null);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setIsProtected(true);
      setProtectionReason('tab_hidden');
    } else {
      // Small delay before removing protection to catch quick alt-tab screenshots
      setTimeout(() => {
        setIsProtected(false);
        setProtectionReason(null);
      }, 100);
    }
  }, []);

  const handleWindowBlur = useCallback(() => {
    setIsProtected(true);
    setProtectionReason('window_blur');
  }, []);

  const handleWindowFocus = useCallback(() => {
    // Small delay before removing protection
    setTimeout(() => {
      setIsProtected(false);
      setProtectionReason(null);
    }, 100);
  }, []);

  useEffect(() => {
    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for window focus/blur
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Check initial state
    if (document.hidden) {
      setIsProtected(true);
      setProtectionReason('tab_hidden');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [handleVisibilityChange, handleWindowBlur, handleWindowFocus]);

  return { isProtected, protectionReason };
}
