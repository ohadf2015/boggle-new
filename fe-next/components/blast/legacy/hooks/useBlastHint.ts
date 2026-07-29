'use client';

/**
 * useBlastHint — hint flow state machine + ad gating.
 *
 * Rules:
 *   • Wave ≥ 6: hint button surfaces. Earlier waves show no button.
 *   • First hint of the run is free. Subsequent hints require a rewarded
 *     ad (or are blocked when ads aren't available).
 *   • Each successful hint deducts HINT_SCORE_PENALTY from the player's
 *     score — applied via the engine's `addBonusScore(-N)`.
 *   • Hint cells stay visible for HINT_HIGHLIGHT_MS, then auto-clear.
 *
 * The hook does NOT pick the cells itself — it accepts a `pickTarget`
 * callback so the caller can provide live grid/tileStates without
 * threading them through the hook every render.
 */

import { useCallback, useRef, useState } from 'react';
import type { HintTarget } from '../utils/blastHintPicker';

/** Wave at which the hint button first appears. */
export const HINT_UNLOCK_WAVE = 6;
/** Score penalty applied each time a hint is consumed. */
export const HINT_SCORE_PENALTY = 25;
/** How long the highlight stays visible (ms). */
export const HINT_HIGHLIGHT_MS = 3500;

export interface UseBlastHintParams {
  waveNumber: number;
  /** Lazy provider — invoked at click time so we always inspect fresh state. */
  pickTarget: () => HintTarget | null;
  /** Score penalty hook — uses the engine's addBonusScore. Pass the negative
   *  of HINT_SCORE_PENALTY to subtract. */
  addBonusScore: (delta: number) => void;
}

export interface UseBlastHintReturn {
  /** True once the wave threshold is met. */
  unlocked: boolean;
  /** True when the player still has their free hint available. */
  freeAvailable: boolean;
  /** Currently visible hint target (null when not displayed). */
  active: HintTarget | null;
  /** Set of "row,col" keys for fast lookup in render layers. */
  activeCellKeys: Set<string>;
  /** Spend the free hint (no ad). Returns the picked target or null. */
  consumeFreeHint: () => HintTarget | null;
  /** Spend an ad-gated hint (caller invokes after rewarded-ad reward). */
  consumeAdHint: () => HintTarget | null;
  /** Total hints used this run (for telemetry / cap checks). */
  usedCount: number;
}

export function useBlastHint({
  waveNumber,
  pickTarget,
  addBonusScore,
}: UseBlastHintParams): UseBlastHintReturn {
  const [active, setActive] = useState<HintTarget | null>(null);
  const [usedCount, setUsedCount] = useState(0);
  const [freeUsed, setFreeUsed] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armDismiss = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setActive(null);
      clearTimerRef.current = null;
    }, HINT_HIGHLIGHT_MS);
  }, []);

  const consume = useCallback(
    (markFree: boolean): HintTarget | null => {
      const target = pickTarget();
      if (!target) return null;
      setActive(target);
      setUsedCount(c => c + 1);
      if (markFree) setFreeUsed(true);
      addBonusScore(-HINT_SCORE_PENALTY);
      armDismiss();
      return target;
    },
    [pickTarget, addBonusScore, armDismiss],
  );

  const consumeFreeHint = useCallback(() => consume(true), [consume]);
  const consumeAdHint = useCallback(() => consume(false), [consume]);

  const unlocked = waveNumber >= HINT_UNLOCK_WAVE;
  const freeAvailable = unlocked && !freeUsed;

  // Pre-compute the cell-key set so the consumer doesn't repeat the join
  // on every render of every tile. Empty when no hint is active.
  const activeCellKeys = new Set<string>();
  if (active) {
    for (const c of active.cells) activeCellKeys.add(`${c.row},${c.col}`);
  }

  return {
    unlocked,
    freeAvailable,
    active,
    activeCellKeys,
    consumeFreeHint,
    consumeAdHint,
    usedCount,
  };
}
