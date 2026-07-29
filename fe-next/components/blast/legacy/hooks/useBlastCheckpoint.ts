/**
 * useBlastCheckpoint — persists highest Blast wave reached so players can
 * resume from progress instead of restarting from wave 1 every session.
 *
 * Storage: localStorage, versioned key. Fails open on corrupt JSON or SSR.
 */
import { useCallback, useEffect, useState } from 'react';

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

export interface UseBlastCheckpointResult {
  checkpoint: BlastCheckpoint | null;
  resumeFromWave: number;
  recordWaveReached: (wave: number) => void;
  clear: () => void;
}

export function useBlastCheckpoint(): UseBlastCheckpointResult {
  const [checkpoint, setCheckpoint] = useState<BlastCheckpoint | null>(null);

  // Hydrate after mount to stay SSR-safe.
  useEffect(() => {
    setCheckpoint(readCheckpoint());
  }, []);

  const recordWaveReached = useCallback((wave: number) => {
    setCheckpoint((prev) => {
      const next: BlastCheckpoint = {
        highestWave: Math.max(prev?.highestWave ?? 0, wave),
        updatedAt: Date.now(),
      };
      writeCheckpoint(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(BLAST_CHECKPOINT_KEY);
      } catch {
        /* noop */
      }
    }
    setCheckpoint(null);
  }, []);

  // Resume one wave PAST the highest cleared — beating wave N unlocks wave N+1.
  // Returning highestWave (the just-cleared wave) made players replay a level
  // they'd already won, which reads as "progress wasn't saved". No checkpoint
  // means a fresh start at wave 1.
  const resumeFromWave = checkpoint ? checkpoint.highestWave + 1 : 1;

  return { checkpoint, resumeFromWave, recordWaveReached, clear };
}
