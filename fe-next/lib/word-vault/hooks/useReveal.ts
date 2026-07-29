/**
 * useReveal — shared primitive for the REVEAL verb.
 *
 * Abstracts the wipe-style discovery mechanic used in 1.3 (Sooted Wall) and
 * intended for re-use in Book 2's "thaw the frost" rooms. Owns:
 *   - per-target progress (0..1)
 *   - per-target threshold (configurable; supports item perks)
 *   - pointer-drag handlers that accumulate wipe distance into progress
 *   - initial-reveal seeds (e.g., melo-lantern auto-reveals first target)
 *
 * Does NOT own: post-reveal puzzle state (e.g., letter-fill in 1.3 stays
 * in the scene component). The hook stops at "the target is revealed."
 *
 * Round-4 critic ask (4/4): JSDoc-only verb taxonomy will erode under
 * production pressure. Extracting this hook + migrating SootedWallScene
 * proves the abstraction before Book 2 designs into it.
 */

'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface UseRevealConfig<T extends string> {
  /** All target IDs this hook tracks (e.g., carving IDs in 1.3). */
  targetIds: readonly T[];
  /**
   * Returns the wipe-progress threshold (0..1) above which a target is "revealed."
   * Item perks live here — caller passes a function that closes over hasItem state.
   */
  thresholdFor: (id: T) => number;
  /**
   * Optional seed values applied once on mount. E.g., lantern auto-reveal:
   * `initialReveal: { water: 1 }` if player has melo-lantern.
   */
  initialReveal?: Partial<Record<T, number>>;
  /**
   * Pixel-distance multiplier per pointer-move tick. Default 0.0035 (= ~285px to
   * fully wipe one target). Lower for "thicker" surfaces.
   */
  wipeRate?: number;
}

export interface UseRevealApi<T extends string> {
  /** Per-target progress map (0..1). */
  revealed: Record<T, number>;
  /** True when target's progress >= threshold. Reactively recomputed. */
  isRevealed: (id: T) => boolean;
  /** Imperatively set a target's progress (used by item perks like lantern). */
  setProgress: (id: T, value: number) => void;
  /** Pointer handlers factory — pass the result to the target's interactive element. */
  handlersFor: (id: T) => {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  };
  /** True when ALL targets are revealed past their thresholds. */
  allRevealed: boolean;
}

const DEFAULT_WIPE_RATE = 0.0035;

export function useReveal<T extends string>(config: UseRevealConfig<T>): UseRevealApi<T> {
  const { targetIds, thresholdFor, initialReveal, wipeRate = DEFAULT_WIPE_RATE } = config;

  const [revealed, setRevealed] = useState<Record<T, number>>(() => {
    const init = {} as Record<T, number>;
    for (const id of targetIds) init[id] = initialReveal?.[id] ?? 0;
    return init;
  });

  const wipingRef = useRef<{ id: T | null; lastX: number; lastY: number } | null>(null);

  // Apply initialReveal AFTER mount as well, so item-perk effects that arrive late
  // (e.g., async store reads) can still seed progress without remounting the hook.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !initialReveal) return;
    seededRef.current = true;
    setRevealed((prev) => {
      const next = { ...prev };
      for (const id of targetIds) {
        const seed = initialReveal[id];
        if (seed !== undefined && seed > (prev[id] ?? 0)) next[id] = seed;
      }
      return next;
    });
  }, [initialReveal, targetIds]);

  const isRevealed = useCallback(
    (id: T) => (revealed[id] ?? 0) >= thresholdFor(id),
    [revealed, thresholdFor],
  );

  const setProgress = useCallback((id: T, value: number) => {
    setRevealed((prev) => ({ ...prev, [id]: Math.min(1, Math.max(0, value)) }));
  }, []);

  const wipe = useCallback(
    (id: T, deltaPx: number) => {
      setRevealed((prev) => ({
        ...prev,
        [id]: Math.min(1, (prev[id] ?? 0) + deltaPx * wipeRate),
      }));
    },
    [wipeRate],
  );

  const handlersFor = useCallback(
    (id: T) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        wipingRef.current = { id, lastX: e.clientX, lastY: e.clientY };
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const w = wipingRef.current;
        if (!w || w.id !== id) return;
        const dx = e.clientX - w.lastX;
        const dy = e.clientY - w.lastY;
        const dist = Math.hypot(dx, dy);
        wipe(id, dist);
        w.lastX = e.clientX;
        w.lastY = e.clientY;
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        wipingRef.current = null;
      },
    }),
    [wipe],
  );

  const allRevealed = targetIds.every((id) => (revealed[id] ?? 0) >= thresholdFor(id));

  return { revealed, isRevealed, setProgress, handlersFor, allRevealed };
}
