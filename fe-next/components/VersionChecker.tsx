'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import NavigationContext from '@/contexts/NavigationContext';
import { useVisibilityPausedInterval } from '@/hooks/useVisibilityPausedInterval';

/**
 * VersionChecker Component
 *
 * Surfaces a new deployment WITHOUT ever interrupting the player:
 * 1. Checks build time on server every 5 minutes
 * 2. If build time differs, raises a "new version available" flag
 * 3. Shows a manual "Refresh" button — NEVER auto-reloads
 * 4. On click: clears ALL caches, unregisters the service worker, reloads
 *
 * Mid-gameplay guard: when NavigationContext reports `isInGame`, the refresh
 * button is hidden entirely so an active round (e.g. a multiplayer game) is
 * never disrupted by an update prompt. The button reappears the moment
 * `isInGame` flips back to false (user exits the game).
 *
 * The reload is always user-initiated — players decide when to update.
 */
export function VersionChecker() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const { t } = useLanguageSafe();
  // Read context directly (not via useNavigation hook) so we never throw if
  // VersionChecker is ever rendered outside the provider tree.
  const nav = useContext(NavigationContext);
  const isInGame = nav?.isInGame ?? false;

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

  const [pollEnabled, setPollEnabled] = useState(false);

  useEffect(() => {
    // Don't check if we just force-updated (prevent reload loop)
    const justUpdated = sessionStorage.getItem('lexiclash-force-updated');
    if (justUpdated) {
      sessionStorage.removeItem('lexiclash-force-updated');
      return;
    }

    // Initial check after 10 seconds (let page load first)
    const initialTimeout = setTimeout(checkForUpdates, 10000);
    setPollEnabled(true);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [checkForUpdates]);

  // Then check every 5 minutes — paused while the tab is hidden. fireOnResume
  // false: no need to manufacture an off-cadence version check on every refocus.
  useVisibilityPausedInterval(checkForUpdates, 5 * 60 * 1000, {
    enabled: pollEnabled,
    fireOnResume: false,
  });

  // No auto-reload. Stay silent unless there's an update AND the player is not
  // mid-game — hiding the prompt during gameplay keeps an active round (e.g. a
  // multiplayer game) completely undisturbed. When `isInGame` flips false the
  // dep change re-renders and the button appears for the user to act on.
  if (!newVersionAvailable || isInGame) {
    return null;
  }

  // Manual refresh prompt — the reload only happens when the user clicks.
  return (
    // Docked bottom-centre, not top-centre: every screen in this app puts a
    // centred title at the top of its header, and a top-centre toast at 2.5rem
    // landed straight on top of it. Sits above the PWA install prompt
    // (fixed bottom-4) and clears the AdMob anchor.
    <div
      // inset-x-0 + justify-center, NOT left-1/2 + -translate-x-1/2: a shrink-to-fit
      // fixed box laid out from the 50% mark can only ever be half the viewport
      // wide, so on a phone "New version available" wrapped to three lines.
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px)+var(--admob-banner-height,0px))] inset-x-0 z-999 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 bg-neo-purple border-3 border-neo-black rounded-neo px-5 py-3 shadow-hard animate-neo-pop">
        <p className="text-neo-white font-bold text-sm">
          {t('system.newVersionAvailable')}
        </p>
        <button
          type="button"
          onClick={forceUpdate}
          className="min-h-[44px] bg-accent text-accent-foreground font-bold text-sm px-4 py-2 border-3 border-neo-black rounded-neo shadow-hard active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5 transition-transform"
        >
          {t('system.refreshToUpdate')}
        </button>
      </div>
    </div>
  );
}

export default VersionChecker;
