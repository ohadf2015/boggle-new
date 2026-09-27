/**
 * useBlastMicroAchievements — drives the {@link BlastMicroToast} popup queue.
 *
 * Watches a snapshot of run state, diffs it against already-shown
 * micro-achievements (in a ref), and queues newly-unlocked IDs into a FIFO.
 * The head of the queue is exposed as `currentId` and auto-advances after
 * `displayMs`.
 *
 * Persistence: NONE — the shown-set lives in a ref, so a new run resets it
 * naturally on remount.
 *
 * StrictMode notes: queue + shown sets are refs (idempotent under
 * double-render). The auto-clear timer is also stored in a ref so cleanup
 * doesn't lose it across StrictMode's mount→unmount→mount cycle.
 */
import { useEffect, useRef, useState } from 'react';
import {
  computeMicroAchievements,
  diffMicroAchievements,
  type BlastMicroId,
  type BlastMicroState,
} from '../utils/blastMicroAchievements';

export interface UseBlastMicroAchievementsOptions {
  displayMs?: number;
  enabled?: boolean;
}

export interface UseBlastMicroAchievementsResult {
  currentId: BlastMicroId | null;
}

const DEFAULT_DISPLAY_MS = 1600;

export function useBlastMicroAchievements(
  snapshot: BlastMicroState,
  options: UseBlastMicroAchievementsOptions = {},
): UseBlastMicroAchievementsResult {
  const displayMs = options.displayMs ?? DEFAULT_DISPLAY_MS;
  const enabled = options.enabled ?? true;
  const shownRef = useRef<Set<BlastMicroId>>(new Set());
  const queueRef = useRef<BlastMicroId[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentId, setCurrentId] = useState<BlastMicroId | null>(null);

  // Detect newly earned achievements after each render. Idempotent under
  // StrictMode because shownRef.add is a Set. When disabled, skip queueing
  // entirely so end-of-wave summary (separate path via useBlastBadgeUnlocks)
  // is unaffected but no in-wave toast surfaces.
  if (enabled) {
    const earned = computeMicroAchievements(snapshot);
    const newly = diffMicroAchievements(shownRef.current, earned);
    if (newly.length > 0) {
      for (const id of newly) {
        if (!shownRef.current.has(id)) {
          shownRef.current.add(id);
          queueRef.current.push(id);
        }
      }
    }
  }

  // Pump: if nothing is showing AND no timer is in flight, pop the next.
  // We deliberately do NOT clear the timer in the effect cleanup — that
  // would lose state across StrictMode remounts. The timer is cleared on
  // true unmount via a separate cleanup-only effect.
  // Pump runs after every render — we cannot use a deps array because new
  // queue items pushed during render don't change `currentId`, but still
  // need scheduling once it goes null. Re-entry is guarded by the timerRef
  // and currentId checks, so this never loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) return;
    if (currentId !== null) return;
    if (timerRef.current !== null) return;
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift()!;
    setCurrentId(next);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCurrentId(null);
    }, displayMs);
  });

  // Unmount-only cleanup.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { currentId };
}
