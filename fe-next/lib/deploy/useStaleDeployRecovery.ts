'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  chunkReloadAlreadyHappened,
  claimChunkRecoveryGuard,
  clearCachesAndReload,
  isChunkLoadError,
} from './staleDeployReload';

export type StaleDeployState = 'reloading' | 'update-ready' | 'not-stale';

function initialState(error: Error | null | undefined, autoReload: boolean): StaleDeployState {
  if (!error || !isChunkLoadError(error.name, error.message)) return 'not-stale';
  if (!autoReload || chunkReloadAlreadyHappened()) return 'update-ready';
  return 'reloading';
}

/**
 * Error-boundary side of stale-deploy recovery: one cache-busting reload per tab, then an
 * "Update ready" state whose Refresh fetches fresh files. Call it after the boundary's own
 * error report so the report goes out before the page leaves.
 */
export function useStaleDeployRecovery(
  error: Error | null | undefined,
  { autoReload }: { autoReload: boolean },
): { state: StaleDeployState; refresh: () => void } {
  const [state, setState] = useState<StaleDeployState>(() => initialState(error, autoReload));

  useEffect(() => {
    const next = initialState(error, autoReload);
    if (next === 'reloading' && !claimChunkRecoveryGuard()) {
      setState('update-ready');
      return;
    }
    setState(next);
    if (next === 'reloading') void clearCachesAndReload();
  }, [error, autoReload]);

  const refresh = useCallback(() => {
    void clearCachesAndReload();
  }, []);

  return { state, refresh };
}
