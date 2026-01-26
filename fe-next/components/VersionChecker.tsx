'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * VersionChecker Component
 *
 * Aggressively clears cache when a new version is deployed:
 * 1. Checks build time on server every 5 minutes
 * 2. If build time differs, clears ALL caches
 * 3. Unregisters service worker
 * 4. Forces page reload (only ONCE to avoid loops)
 *
 * This ensures users ALWAYS get the latest version after deployment.
 */
export function VersionChecker() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const { t } = useLanguage();

  // Get build time from environment (set at build in next.config.mjs)
  const currentBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

  const checkForUpdates = useCallback(async () => {
    try {
      // Fetch current build time from server (bypasses cache)
      const response = await fetch('/api/version?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) return; // Silently fail if version endpoint not available

      const { buildTime: serverBuildTime } = await response.json();

      // Compare build times
      if (currentBuildTime && serverBuildTime && currentBuildTime !== serverBuildTime) {
        console.log('[Version] New version detected:', {
          current: currentBuildTime,
          server: serverBuildTime,
        });
        setNewVersionAvailable(true);
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.warn('[Version] Update check failed:', error);
    }
  }, [currentBuildTime]);

  const forceUpdate = useCallback(async () => {
    console.log('[Version] Force updating to new version...');

    try {
      // Step 1: Clear ALL caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter(key => key.startsWith('lexiclash-'))
            .map(key => caches.delete(key))
        );
        console.log('[Version] Cleared caches:', cacheKeys.length);
      }

      // Step 2: Unregister ALL service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('[Version] Unregistered service workers:', registrations.length);
      }

      // Step 3: Set flag to prevent reload loop
      sessionStorage.setItem('lexiclash-force-updated', 'true');

      // Step 4: Force reload (hard reload to bypass any remaining cache)
      window.location.reload();
    } catch (error) {
      console.error('[Version] Force update failed:', error);
      // Fallback: Just reload without cache clearing
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    // Don't check if we just force-updated (prevent reload loop)
    const justUpdated = sessionStorage.getItem('lexiclash-force-updated');
    if (justUpdated) {
      sessionStorage.removeItem('lexiclash-force-updated');
      return;
    }

    // Initial check after 10 seconds (let page load first)
    const initialTimeout = setTimeout(checkForUpdates, 10000);

    // Then check every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  // Auto-update after 10 seconds of showing banner
  useEffect(() => {
    if (newVersionAvailable) {
      const timeout = setTimeout(forceUpdate, 10000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [newVersionAvailable, forceUpdate]);

  // Don't render anything - updates happen silently
  if (!newVersionAvailable) {
    return null;
  }

  // Show brief notification before auto-reload
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="bg-neo-purple border-3 border-neo-black rounded-neo px-6 py-3 shadow-hard animate-neo-pop">
        <p className="text-neo-white font-bold text-sm">
          {t('system.updatingToNewVersion') || 'Updating to new version...'}
        </p>
      </div>
    </div>
  );
}

export default VersionChecker;
