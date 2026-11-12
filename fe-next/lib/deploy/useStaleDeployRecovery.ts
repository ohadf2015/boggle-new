'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  chunkReloadAlreadyHappened,
  claimChunkRecoveryGuard,
  clearCachesAndReload,
  isBrowserOffline,
  isChunkLoadError,
} from './staleDeployReload';
import { autoReloadHeldBack } from './liveGamePaths';

export type StaleDeployState = 'reloading' | 'update-ready' | 'not-stale';

function initialState(error: Error | null | undefined, autoReload: boolean): StaleDeployState {
  if (!error || !isChunkLoadError(error.name, error.message) || isBrowserOffline()) return 'not-stale';
  if (!autoReload || autoReloadHeldBack() || chunkReloadAlreadyHappened()) return 'update-ready';
  return 'reloading';
}

/**
 * Error-boundary side of stale-deploy recovery: one cache-busting reload per build per tab, then an
 * "Update ready" state whose Refresh fetches fresh files. Live game paths never reload by themselves.
 * Call it after the boundary's own error report so the report goes out before the page leaves.
 */
export function useStaleDeployRecovery(
  error: Error | null | undefined,
  { autoReload }: { autoReload: boolean },
): { state: StaleDeployState; refresh: () => void } {
  const [state, setState] = useState<StaleDeployState>(() => initialState(error, autoReload));
  const reloadStarted = useRef(false);

  useEffect(() => {
    if (reloadStarted.current) return;
    const next = initialState(error, autoReload);
    if (next === 'reloading' && !claimChunkRecoveryGuard()) {
      setState('update-ready');
      return;
    }
    setState(next);
    if (next === 'reloading') {
      reloadStarted.current = true;
      void clearCachesAndReload();
    }
  }, [error, autoReload]);

  const refresh = useCallback(() => {
    void clearCachesAndReload();
  }, []);

  return { state, refresh };
}
