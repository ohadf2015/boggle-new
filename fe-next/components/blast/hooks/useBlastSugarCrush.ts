'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { planSugarCrush } from '../utils/blastSugarCrush';
import type { BlastTileState } from '../types';

/** Score bonus per Sugar Crush tile conversion */
const SUGAR_CRUSH_TILE_BONUS = 10;

/** Return type for useBlastSugarCrush */
export interface BlastSugarCrushHook {
  /** True while the Sugar Crush sequence is actively running */
  isActive: boolean;
  /**
   * Start the Sugar Crush sequence.
   * Plans tile conversions, then fires them in a staggered timed chain.
   *
   * @param tileStates - Current grid state (used to select candidates)
   * @param gridSize - Grid dimension
   * @param setTileStates - React state setter for tileStates (receives updater fn)
   * @param addExplosion - Callback to trigger explosion visual at a position
   * @param addScore - Callback to add bonus score for each tile converted
   * @param onComplete - Called after all steps complete, with total bonus score
   */
  start: (
    tileStates: BlastTileState[][],
    gridSize: number,
    setTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void,
    addExplosion: (row: number, col: number, type: string) => void,
    addScore: (bonus: number) => void,
    onComplete: (totalBonusScore: number) => void,
  ) => void;
  /** Cancel the running sequence and clear all pending timers */
  cancel: () => void;
}

/**
 * useBlastSugarCrush — orchestrates the Sugar Crush end-of-level sequence.
 *
 * When the player runs out of moves, this hook:
 * 1. Plans which tiles to convert (via planSugarCrush)
 * 2. Fires each conversion at its scheduled delay via setTimeout chain
 * 3. Reports completion with total bonus score via onComplete callback
 *
 * All timers are cleared on unmount or cancel() call.
 */
export function useBlastSugarCrush(): BlastSugarCrushHook {
  const [isActive, setIsActive] = useState(false);

  // Track pending timers for cleanup
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Track whether the hook is still mounted (prevents setState after unmount)
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear all pending timers on unmount
      for (const timer of timerRefs.current) {
        clearTimeout(timer);
      }
      timerRefs.current = [];
    };
  }, []);

  const cancel = useCallback(() => {
    // Clear all pending timers
    for (const timer of timerRefs.current) {
      clearTimeout(timer);
    }
    timerRefs.current = [];
    if (mountedRef.current) {
      setIsActive(false);
    }
  }, []);

  const start = useCallback((
    tileStates: BlastTileState[][],
    gridSize: number,
    setTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void,
    addExplosion: (row: number, col: number, type: string) => void,
    addScore: (bonus: number) => void,
    onComplete: (totalBonusScore: number) => void,
  ) => {
    // Plan the sequence
    const steps = planSugarCrush(tileStates, gridSize);

    // Nothing to do — call onComplete immediately
    if (steps.length === 0) {
      onComplete(0);
      return;
    }

    if (mountedRef.current) {
      setIsActive(true);
    }

    let totalBonusScore = 0;

    // Schedule each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isLast = i === steps.length - 1;

      const timer = setTimeout(() => {
        if (!mountedRef.current) return;

        // Convert tile type in place
        setTileStates((prev: BlastTileState[][]) => {
          // Create shallow copy of grid rows and the affected row
          const next = prev.map((row, r) =>
            r === step.row
              ? row.map((tile, c) =>
                  c === step.col ? { ...tile, type: step.convertTo } : tile
                )
              : row,
          );
          return next;
        });

        // Trigger explosion visual
        addExplosion(step.row, step.col, step.convertTo);

        // Accumulate bonus score
        const bonus = SUGAR_CRUSH_TILE_BONUS;
        totalBonusScore += bonus;
        addScore(bonus);

        // Call onComplete after last step
        if (isLast) {
          if (mountedRef.current) {
            setIsActive(false);
          }
          onComplete(totalBonusScore);
        }
      }, step.delayMs);

      timerRefs.current.push(timer);
    }
  }, []);

  return { isActive, start, cancel };
}
