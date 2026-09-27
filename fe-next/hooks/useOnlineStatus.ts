/**
 * Hook to monitor browser online/offline status
 *
 * Returns true when connected, false when offline.
 * SSR-safe - returns true when navigator is undefined.
 */

'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  // Always start online so SSR (no navigator) and the client's FIRST render
  // agree — reading navigator.onLine in the initializer makes them diverge when
  // the client is offline at hydration, flipping downstream element types
  // (e.g. ModeCard <button> vs <a>) and triggering React #418 tree
  // regeneration. The real status is synced in the effect below, post-mount.
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Sync the actual status now that we're on the client, post-hydration.
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
