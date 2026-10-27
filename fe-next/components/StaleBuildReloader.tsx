'use client';

import { useCallback, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import NavigationContext from '@/contexts/NavigationContext';
import { useVisibilityPausedInterval } from '@/hooks/useVisibilityPausedInterval';
import { clearCachesAndReload } from '@/lib/deploy/staleDeployReload';
import {
  claimStaleBuildReload,
  clientBuildIdentity,
  getStaleBuildReloadGuard,
  isBuildStale,
  shouldAutoReloadStaleBuild,
  tabOpenMs,
  STALE_BUILD_CHECK_INTERVAL_MS,
} from '@/lib/deploy/staleBuildAutoReload';

/**
 * StaleBuildReloader — auto-reloads long-lived tabs running an outdated build.
 *
 * Why: VersionChecker only shows a manual toast; a forgotten tab (kiosk PC,
 * idle browser window) never clicks it, so its stale bundle keeps polling old
 * code paths forever and hits "Loading chunk N failed" after each deploy
 * (t_64ecd326). This component closes that gap:
 *
 *  - Polls /api/version every 10 min while visible + on visibilitychange→visible.
 *  - Reloads ONLY when the build is provably stale, the tab has been open
 *    > 30 min, the tab is visible, and no game is in progress.
 *  - In-game (NavigationContext.isInGame): defers — the pending flag below
 *    re-fires the decision when the round ends (isInGame flips) or on the
 *    next route change, turning that navigation into a full page load.
 *  - Never reloads while hidden; sessionStorage guard caps 1 reload / 30 min.
 *
 * Renders nothing. Reads context directly (not via useNavigation) so it can
 * never throw outside the provider tree — missing provider = isInGame false.
 */
export function StaleBuildReloader() {
  const nav = useContext(NavigationContext);
  const isInGame = nav?.isInGame ?? false;
  const pathname = usePathname();
  // True once a stale build was detected but the moment was unsafe (in-game /
  // hidden / too fresh). Re-evaluated on every render where the gates change.
  const pendingReloadRef = useRef(false);
  // Latest values for the interval callback without restarting the interval.
  const isInGameRef = useRef(isInGame);
  isInGameRef.current = isInGame;

  const maybeReload = useCallback(() => {
    // Decision inputs are re-read at fire time; `stale: true` is implied —
    // callers only reach here after a confirmed mismatch.
    const allowed = shouldAutoReloadStaleBuild({
      stale: true,
      visible: typeof document === 'undefined' ? false : !document.hidden,
      isInGame: isInGameRef.current,
      tabOpenMs: tabOpenMs(),
      lastReloadAt: getStaleBuildReloadGuard(),
      now: Date.now(),
    });
    if (!allowed) {
      pendingReloadRef.current = true;
      return;
    }
    if (!claimStaleBuildReload()) return;
    // Reuse the chunk-recovery reload path: activates a waiting SW, purges
    // Cache Storage, then navigates with the network-only cache-bust param —
    // exactly what a tab whose chunks no longer exist needs.
    void clearCachesAndReload();
  }, []);

  const checkForStaleBuild = useCallback(async () => {
    if (pendingReloadRef.current) {
      // Already known stale — just retry the safe-moment decision, no fetch.
      maybeReload();
      return;
    }
    try {
      const response = await fetch('/api/version?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!response.ok) return; // fail-safe: never reload on uncertainty
      const data = await response.json();
      const client = clientBuildIdentity();
      if (
        isBuildStale({
          clientCommit: client.commit,
          serverCommit: typeof data.commit === 'string' ? data.commit : undefined,
          clientBuildTime: client.buildTime,
          serverBuildTime: typeof data.buildTime === 'string' ? data.buildTime : undefined,
        })
      ) {
        maybeReload();
      }
    } catch {
      // Offline / endpoint missing — do nothing this tick.
    }
  }, [maybeReload]);

  // Every 10 min while visible, and once on each return to a visible tab —
  // a hidden tab that slept through 20 deploys gets re-checked the moment it
  // is focused again, before its next stale poll hits the server.
  useVisibilityPausedInterval(checkForStaleBuild, STALE_BUILD_CHECK_INTERVAL_MS, {
    fireOnResume: true,
  });

  // Deferred path: a mismatch found mid-round (or while fresh/hidden) lands
  // here. Re-runs when the round ends (isInGame flips false) or the user
  // navigates (pathname changes — the next router push effectively becomes a
  // full load, since maybeReload hard-navigates the current URL).
  useEffect(() => {
    if (pendingReloadRef.current) maybeReload();
  }, [isInGame, pathname, maybeReload]);

  return null;
}

export default StaleBuildReloader;
