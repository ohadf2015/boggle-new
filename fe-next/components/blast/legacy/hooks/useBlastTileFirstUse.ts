'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BlastTileState, BlastTileType } from '../types';
import { selectBlastTileToTeach, collectVisibleSpecialTypes } from '@/lib/blast/blastTileFirstUse';
import { isCoachOnScreen } from '@/lib/tutorial/modeCoachStore';

const COACH_RECHECK_MS = 300;

const STORAGE_KEY = 'blast.tilesSeen.v1';

function loadSeen(): Set<BlastTileType> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as BlastTileType[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistSeen(seen: Set<BlastTileType>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    /* private mode / quota — teaching just won't persist */
  }
}

export interface BlastTileFirstUse {
  /** The special tile to teach right now, or null. */
  teaching: BlastTileType | null;
  /** Dismiss the current callout. */
  dismiss: () => void;
}

/**
 * Show a one-time "what this tile does" callout the first time each curated
 * special tile appears on the player's board. One at a time, persisted so it
 * never repeats. `enabled=false` (e.g. reduced-motion, or non-playing phase)
 * suppresses new callouts without losing seen-state.
 */
export function useBlastTileFirstUse(
  tileStates: BlastTileState[][],
  enabled = true,
): BlastTileFirstUse {
  const seenRef = useRef<Set<BlastTileType>>(loadSeen());
  const [teaching, setTeaching] = useState<BlastTileType | null>(null);

  const dismiss = useCallback(() => setTeaching(null), []);

  useEffect(() => {
    if (!enabled) return;
    // Don't replace a callout the player is still reading.
    if (teaching) return;
    let cancelled = false;
    let retryId: number | undefined;

    const tryTeach = () => {
      if (cancelled) return;
      // Stay quiet while the mode-level FTUE coach is on screen — two
      // competing onboarding overlays at once is confusing, not helpful.
      if (isCoachOnScreen()) {
        retryId = window.setTimeout(tryTeach, COACH_RECHECK_MS);
        return;
      }
      const present = collectVisibleSpecialTypes(tileStates);
      const next = selectBlastTileToTeach(present, seenRef.current);
      if (next) {
        // Mark seen immediately so it shows exactly once, even if dismissed fast.
        seenRef.current.add(next);
        persistSeen(seenRef.current);
        setTeaching(next);
      }
    };
    tryTeach();

    return () => {
      cancelled = true;
      if (retryId !== undefined) window.clearTimeout(retryId);
    };
  }, [tileStates, enabled, teaching]);

  return { teaching, dismiss };
}
