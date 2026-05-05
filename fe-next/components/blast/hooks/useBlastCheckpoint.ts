/**
 * useBlastCheckpoint — persists highest Blast wave reached so players can
 * resume from progress instead of restarting from wave 1 every session.
 *
 * Storage: localStorage, versioned key. Fails open on corrupt JSON or SSR.
 *
 * Two persistence modes:
 *   - Default (`requiresAd: false`): recordWaveReached auto-persists.
 *   - Ad-gated  (`requiresAd: true`):  recordWaveReached updates in-memory
 *     state only; caller invokes persistCheckpoint() once a rewarded-ad
 *     watch completes. Without ad, progress evaporates at session end.
 *
 * The ad-gated mode lets us monetise progress without forcing an ad on
 * every wave-clear (hostile UX). Caller drives the prompt + ad flow.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const BLAST_CHECKPOINT_KEY = 'blast:checkpoint:v1';

export interface BlastCheckpoint {
  highestWave: number;
  updatedAt: number;
}

function readCheckpoint(): BlastCheckpoint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BLAST_CHECKPOINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.highestWave !== 'number') return null;
    return parsed as BlastCheckpoint;
  } catch {
    return null;
  }
}

function writeCheckpoint(cp: BlastCheckpoint): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BLAST_CHECKPOINT_KEY, JSON.stringify(cp));
  } catch {
    /* quota or disabled storage — fail silently */
  }
}

export interface UseBlastCheckpointOptions {
  /** When true, recordWaveReached is in-memory only; caller must invoke
   *  persistCheckpoint() (typically after a rewarded-ad watch) for the
   *  wave to survive across sessions. */
  requiresAd?: boolean;
}

export interface UseBlastCheckpointResult {
  checkpoint: BlastCheckpoint | null;
  resumeFromWave: number;
  recordWaveReached: (wave: number) => void;
  /** True when there's in-memory progress not yet written to storage.
   *  Only meaningful when requiresAd: true. */
  hasUnpersistedProgress: boolean;
  /** Persist the current in-memory checkpoint to localStorage. Returns
   *  the wave that was persisted, or null if nothing was in memory. */
  persistCheckpoint: () => number | null;
  clear: () => void;
}

export function useBlastCheckpoint(
  options: UseBlastCheckpointOptions = {},
): UseBlastCheckpointResult {
  const { requiresAd = false } = options;
  const [checkpoint, setCheckpoint] = useState<BlastCheckpoint | null>(null);

  // Track unpersisted in-memory progress separately from the persisted
  // checkpoint so the caller can drive a save-prompt UX correctly.
  const [hasUnpersistedProgress, setHasUnpersistedProgress] = useState(false);
  const inMemoryWaveRef = useRef(0);

  // Hydrate after mount to stay SSR-safe.
  useEffect(() => {
    setCheckpoint(readCheckpoint());
  }, []);

  const recordWaveReached = useCallback((wave: number) => {
    if (requiresAd) {
      // In-memory only — persistence deferred to persistCheckpoint().
      setCheckpoint((prev) => {
        const merged = Math.max(prev?.highestWave ?? 0, wave);
        inMemoryWaveRef.current = merged;
        return prev ?? null;
      });
      setHasUnpersistedProgress(true);
      return;
    }
    setCheckpoint((prev) => {
      const next: BlastCheckpoint = {
        highestWave: Math.max(prev?.highestWave ?? 0, wave),
        updatedAt: Date.now(),
      };
      writeCheckpoint(next);
      return next;
    });
  }, [requiresAd]);

  const persistCheckpoint = useCallback((): number | null => {
    const target = inMemoryWaveRef.current;
    if (target <= 0) return null;
    const next: BlastCheckpoint = { highestWave: target, updatedAt: Date.now() };
    writeCheckpoint(next);
    setCheckpoint(next);
    setHasUnpersistedProgress(false);
    return target;
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(BLAST_CHECKPOINT_KEY);
      } catch {
        /* noop */
      }
    }
    inMemoryWaveRef.current = 0;
    setHasUnpersistedProgress(false);
    setCheckpoint(null);
  }, []);

  // resumeFromWave reflects persisted state only — players who decline
  // the ad get bumped back to wave 1 next session.
  const resumeFromWave = Math.max(1, checkpoint?.highestWave ?? 1);

  return {
    checkpoint,
    resumeFromWave,
    recordWaveReached,
    hasUnpersistedProgress,
    persistCheckpoint,
    clear,
  };
}
