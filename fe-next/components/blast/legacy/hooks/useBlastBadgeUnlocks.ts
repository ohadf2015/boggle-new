'use client';

/**
 * useBlastBadgeUnlocks — results-screen side effect for badge unlocks.
 *
 * Given a finished run, this hook:
 *   1. Computes earned badge ids (pure)
 *   2. Diffs against the persisted store to find new unlocks
 *   3. Persists them
 *   4. Fires one sonner toast + haptic per new unlock (staggered)
 *   5. Returns enriched badge descriptors for the UI
 *
 * Idempotent across React 19 strict-mode double-invocation: a ref guards
 * the effect so toasts fire exactly once per results mount.
 */
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  BLAST_BADGES,
  computeEarnedBadges,
  getBadgeDef,
  type BlastBadgeId,
} from '@/components/blast/legacy/utils/blastBadges';
import { useBlastBadgeStore } from '@/stores/blastBadgeStore';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { trackBlastBadgeUnlocked } from '@/components/blast/legacy/utils/blastTelemetry';
import type { BlastResultsData } from '@/components/blast/legacy/types';

export interface EnrichedBadge {
  id: BlastBadgeId;
  icon: string;
  label: string;
  desc: string;
  isNew: boolean;
}

interface UseBlastBadgeUnlocksOptions {
  results: BlastResultsData | null;
  t: (key: string, fallback?: string) => string;
  /** Delay (ms) between successive toasts so they don't stack on top of each other. */
  toastStaggerMs?: number;
}

export function useBlastBadgeUnlocks({
  results,
  t,
  toastStaggerMs = 600,
}: UseBlastBadgeUnlocksOptions): EnrichedBadge[] {
  // Pure compute — stable across renders as long as results reference is stable.
  const earnedIds = useMemo(
    () => (results ? computeEarnedBadges(results) : []),
    [results],
  );

  // Read once on first render so `isNew` reflects the state *before* unlock.
  const initialOwnedRef = useRef<Set<BlastBadgeId> | null>(null);
  if (initialOwnedRef.current === null) {
    initialOwnedRef.current = new Set(useBlastBadgeStore.getState().unlockedIds);
  }
  const initialOwned = initialOwnedRef.current;

  // Fire unlock side-effects exactly once per mount.
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || earnedIds.length === 0) return;
    firedRef.current = true;

    const store = useBlastBadgeStore.getState();
    const fresh = store.diffNewBadges(earnedIds);
    if (fresh.length === 0) return;

    // Persist all unlocks up-front (so a reload mid-toast-queue still sticks).
    const runFinalScore = results?.finalScore ?? 0;
    fresh.forEach((id) => {
      store.unlockBadge(id);
      trackBlastBadgeUnlocked({ badgeId: id, runFinalScore });
    });

    // Stagger toasts + haptics so the player can register each one.
    const timers: number[] = [];
    fresh.forEach((id, i) => {
      const def = getBadgeDef(id);
      if (!def) return;
      const timer = window.setTimeout(() => {
        triggerHaptic('success');
        toast.success(t('blast.results.newBadge', 'NEW BADGE'), {
          description: t(def.labelKey, def.id),
          duration: 4000,
        });
      }, i * toastStaggerMs);
      timers.push(timer);
    });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [earnedIds, t, toastStaggerMs, results?.finalScore]);

  // Build enriched list for the UI: preserve registry order, mark `isNew`
  // against the snapshot taken BEFORE this run's unlocks were persisted.
  return useMemo(
    () =>
      BLAST_BADGES.filter((def) => earnedIds.includes(def.id)).map((def) => ({
        id: def.id,
        icon: def.icon,
        label: t(def.labelKey, def.id),
        desc: t(def.descKey, ''),
        isNew: !initialOwned.has(def.id),
      })),
    [earnedIds, t, initialOwned],
  );
}
