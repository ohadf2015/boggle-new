'use client';

import { useCallback, useMemo } from 'react';

interface ShareData {
  title: string;
  text: string;
  url: string;
}

interface UseNativeShareReturn {
  /** Whether native share API is available (typically mobile browsers) */
  canNativeShare: boolean;

  /**
   * Attempt to share using native share sheet
   * @returns true if share was successful, false if cancelled or failed
   */
  nativeShare: (data: ShareData) => Promise<boolean>;

  /**
   * Share with fallback - tries native first, returns false if not available
   * Use this to determine if fallback UI should be shown
   */
  tryNativeShare: (data: ShareData) => Promise<boolean>;
}

/**
 * useNativeShare - Hook for native share API (Web Share API)
 *
 * Provides a simple interface to detect and use the native share sheet
 * on mobile devices. Falls back gracefully on desktop.
 *
 * @example
 * const { canNativeShare, nativeShare, tryNativeShare } = useNativeShare();
 *
 * const handleShare = async () => {
 *   const shared = await tryNativeShare({
 *     title: 'Join my game!',
 *     text: 'Let\'s play LexiClash together!',
 *     url: 'https://lexiclash.com?room=ABC123',
 *   });
 *
 *   if (!shared) {
 *     // Show fallback share modal
 *     setShowShareModal(true);
 *   }
 * };
 */
export function useNativeShare(): UseNativeShareReturn {
  // Check if navigator.share is available (SSR-safe)
  const canNativeShare = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return 'share' in navigator && typeof navigator.share === 'function';
  }, []);

  const nativeShare = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!canNativeShare) {
      return false;
    }

    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return true;
    } catch (error) {
      // User cancelled or share failed
      // AbortError = user cancelled (normal)
      // NotAllowedError = permission denied
      // TypeError = invalid data
      const errorName = error instanceof Error || error instanceof DOMException
        ? error.name
        : String(error);

      if (errorName === 'AbortError') {
        // User cancelled - this is normal behavior, don't log as error
        return false;
      }

      // Only log actual errors (not user cancellations)
      console.error('Share failed:', error);
      return false;
    }
  }, [canNativeShare]);

  const tryNativeShare = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!canNativeShare) {
      return false;
    }
    return nativeShare(data);
  }, [canNativeShare, nativeShare]);

  return {
    canNativeShare,
    nativeShare,
    tryNativeShare,
  };
}

export default useNativeShare;
