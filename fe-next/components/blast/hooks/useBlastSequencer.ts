'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GravityResult } from '../utils/blastGravity';

// ==================== Types ====================

export type AnimPhase = 'idle' | 'anticipation' | 'clearing' | 'falling' | 'landing' | 'appearing' | 'chain_pause';

export interface TileAnimState {
  row: number;
  col: number;
  phase: AnimPhase;
  /** How many rows this tile needs to fall (for falling phase) */
  fallDistance?: number;
  /** Column index for stagger delay calculation */
  column?: number;
  /** Spawn offset for appearing tiles (rows above grid) */
  spawnOffset?: number;
  /** Random rotation for clearing phase (-12 to 12 degrees) */
  clearRotate?: number;
}

export interface SequencerState {
  phase: AnimPhase;
  activeTiles: TileAnimState[];
  isAnimating: boolean;
  chainLevel: number;
}

export interface UseBlastSequencerReturn {
  state: SequencerState;
  animateWordClear: (clearedTiles: Array<{ row: number; col: number; type: string }>) => Promise<void>;
  animateCascade: (gravity: GravityResult, chainLevel: number) => Promise<void>;
  reset: () => void;
}

// ==================== Timing Constants ====================

export const ANIM_TIMING = {
  anticipation: 120,
  clearing: 180,
  clearStagger: 8,
  pauseAfterClear: 150,
  fallBase: 250,
  fallPerRow: 50,
  columnStagger: 30,
  landBounce: 80,
  appearBase: 200,
  appearStagger: 12,
  chainPause: 100,
  chainSpeedFn: (level: number) => Math.max(0.65, 1 - level * 0.12),
} as const;

// ==================== Helpers ====================

/**
 * Frame-aligned wait — setTimeout for the duration, then resolve on the next
 * requestAnimationFrame so the subsequent setState lands at paint time.
 * Falls back to pure setTimeout in non-browser environments.
 */
function wait(ms: number, timers: ReturnType<typeof setTimeout>[]): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        resolve();
      }
    }, ms);
    timers.push(id);
  });
}

const INITIAL_STATE: SequencerState = {
  phase: 'idle',
  activeTiles: [],
  isAnimating: false,
  chainLevel: 0,
};

// ==================== Hook ====================

export function useBlastSequencer(): UseBlastSequencerReturn {
  const [state, setState] = useState<SequencerState>(INITIAL_STATE);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);
  // Working state ref — mutations happen here; only committed to React state
  // when the phase changes (i.e. when the UI actually needs to re-render).
  const workingRef = useRef<SequencerState>(INITIAL_STATE);
  // Cancellation token — incremented on reset() so in-flight async sequences abort
  const cancelTokenRef = useRef(0);
  // Concurrent execution guard — prevents overlapping animate calls
  const runningRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
    };
  }, []);

  /** Commit working state to React — only triggers re-render if phase changed.
   *  Checks cancellation token to prevent stale writes after reset(). */
  const commit = useCallback((next: SequencerState, token: number) => {
    if (token !== cancelTokenRef.current) return; // stale sequence — abort
    workingRef.current = next;
    if (mountedRef.current) setState(next);
  }, []);

  const animateWordClear = useCallback(async (
    clearedTiles: Array<{ row: number; col: number; type: string }>,
  ): Promise<void> => {
    if (runningRef.current) return; // guard against concurrent execution
    runningRef.current = true;
    const token = cancelTokenRef.current;
    const cancelled = () => token !== cancelTokenRef.current;

    try {
      const tiles: TileAnimState[] = clearedTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'anticipation' as AnimPhase,
      }));

      // Phase 1: Anticipation
      commit({ phase: 'anticipation', activeTiles: tiles, isAnimating: true, chainLevel: 0 }, token);
      await wait(ANIM_TIMING.anticipation, timersRef.current);
      if (cancelled()) return;

      // Phase 2: Clearing (with random rotation per tile)
      const clearTiles = tiles.map((t) => ({
        ...t,
        phase: 'clearing' as AnimPhase,
        clearRotate: Math.round((Math.random() - 0.5) * 24), // -12 to 12 degrees
      }));
      commit({ ...workingRef.current, phase: 'clearing', activeTiles: clearTiles }, token);
      const clearDur = ANIM_TIMING.clearing + ANIM_TIMING.clearStagger * clearedTiles.length;
      await wait(clearDur, timersRef.current);
      if (cancelled()) return;

      // Done — caller runs cascade next
      commit({ ...workingRef.current, phase: 'idle', activeTiles: [], isAnimating: false }, token);
    } finally {
      runningRef.current = false;
    }
  }, [commit]);

  const animateCascade = useCallback(async (
    gravity: GravityResult,
    chainLevel: number,
  ): Promise<void> => {
    if (runningRef.current) return; // guard against concurrent execution
    runningRef.current = true;
    const token = cancelTokenRef.current;
    const cancelled = () => token !== cancelTokenRef.current;

    try {
      const speed = ANIM_TIMING.chainSpeedFn(chainLevel);

      // Phase 0: Anticipation beat — brief dramatic pause before cascade resolves
      if (gravity.clearedTiles.length > 0 && chainLevel >= 1) {
        commit({ phase: 'anticipation', activeTiles: [], isAnimating: true, chainLevel }, token);
        await wait(ANIM_TIMING.chainPause * 2 * speed, timersRef.current);
        if (cancelled()) return;
      }

      // Phase 1: Clear cascade-matched tiles
      if (gravity.clearedTiles.length > 0) {
        const clearTiles: TileAnimState[] = gravity.clearedTiles.map((t) => ({
          row: t.row, col: t.col, phase: 'clearing' as AnimPhase,
        }));
        commit({ phase: 'clearing', activeTiles: clearTiles, isAnimating: true, chainLevel }, token);
        const clearDur = (ANIM_TIMING.clearing + ANIM_TIMING.clearStagger * gravity.clearedTiles.length) * speed;
        await wait(clearDur, timersRef.current);
        if (cancelled()) return;
        await wait(ANIM_TIMING.pauseAfterClear * speed, timersRef.current);
        if (cancelled()) return;
      }

      // Phase 2: Falling
      if (gravity.fallingTiles.length > 0) {
        const fallTiles: TileAnimState[] = gravity.fallingTiles.map((t) => ({
          row: t.row, col: t.col, phase: 'falling' as AnimPhase,
          fallDistance: t.fallDistance, column: t.col,
        }));
        commit({ ...workingRef.current, phase: 'falling', activeTiles: fallTiles, chainLevel }, token);
        const maxFall = gravity.fallingTiles.reduce((m, t) => Math.max(m, t.fallDistance), 0);
        const fallDur = (ANIM_TIMING.fallBase + ANIM_TIMING.fallPerRow * maxFall) * speed;
        await wait(fallDur, timersRef.current);
        if (cancelled()) return;

        // Landing phase — brief squish-bounce at destination
        const landTiles: TileAnimState[] = gravity.fallingTiles.map((t) => ({
          row: t.row, col: t.col, phase: 'landing' as AnimPhase,
          fallDistance: t.fallDistance, column: t.col,
        }));
        commit({ ...workingRef.current, phase: 'landing', activeTiles: landTiles, chainLevel }, token);
        await wait(ANIM_TIMING.landBounce * speed, timersRef.current);
        if (cancelled()) return;
      }

      // Phase 3: Appearing
      if (gravity.newTiles.length > 0) {
        const appearTiles: TileAnimState[] = gravity.newTiles.map((t) => ({
          row: t.row, col: t.col, phase: 'appearing' as AnimPhase,
          spawnOffset: t.spawnOffset, column: t.col,
        }));
        commit({ ...workingRef.current, phase: 'appearing', activeTiles: appearTiles, chainLevel }, token);
        const appearDur = (ANIM_TIMING.appearBase + ANIM_TIMING.appearStagger * gravity.newTiles.length) * speed;
        await wait(appearDur, timersRef.current);
        if (cancelled()) return;
      }

      // Phase 4: Chain pause — keep last active tiles visible to avoid pop
      const lastTiles = workingRef.current.activeTiles;
      commit({ ...workingRef.current, phase: 'chain_pause', activeTiles: lastTiles, chainLevel }, token);
      await wait(ANIM_TIMING.chainPause * speed, timersRef.current);
      if (cancelled()) return;

      // Done
      commit(INITIAL_STATE, token);
    } finally {
      runningRef.current = false;
    }
  }, [commit]);

  const reset = useCallback(() => {
    cancelTokenRef.current++; // invalidate all in-flight async sequences
    runningRef.current = false;
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    workingRef.current = INITIAL_STATE;
    setState(INITIAL_STATE);
  }, []);

  return { state, animateWordClear, animateCascade, reset };
}
