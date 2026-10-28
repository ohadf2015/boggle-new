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
  animateWordClear: (clearedTiles: Array<{ row: number; col: number; type: string }>, onClearStart?: () => void) => Promise<void>;
  animateCascade: (gravity: GravityResult, chainLevel: number, commitFn?: () => void) => Promise<void>;
  reset: () => void;
}

// ==================== Timing Constants ====================

/** Tile types that warrant a longer anticipation beat for dramatic effect */
const SPECIAL_TILE_TYPES = new Set(['bomb', 'lightning', 'prism', 'rainbow', 'diamond', 'gem', 'catalyst']);

// Input stays locked from anticipation through landing; keep that span near 600ms for a plain word.
export const ANIM_TIMING = {
  anticipation: 80,
  /** Extended anticipation for paths containing special tiles — builds tension */
  anticipationSpecial: 160,
  clearing: 220,
  clearStagger: 5,
  pauseAfterClear: 60,
  fallBase: 160,
  fallPerRow: 30,
  columnStagger: 25,
  landBounce: 50,
  appearBase: 340,
  appearStagger: 15,
  chainPause: 80,
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
  const commitSeqRef = useRef(0);

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
    commitSeqRef.current++;
    workingRef.current = next;
    if (mountedRef.current) setState(next);
  }, []);

  const animateWordClear = useCallback(async (
    clearedTiles: Array<{ row: number; col: number; type: string }>,
    onClearStart?: () => void,
  ): Promise<void> => {
    if (runningRef.current) return; // guard against concurrent execution
    runningRef.current = true;
    const token = cancelTokenRef.current;
    const cancelled = () => token !== cancelTokenRef.current;

    try {
      const tiles: TileAnimState[] = clearedTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'anticipation' as AnimPhase,
      }));

      // Phase 1: Anticipation — longer pause when special tiles are involved
      const hasSpecial = clearedTiles.some(t => SPECIAL_TILE_TYPES.has(t.type));
      const anticipationMs = hasSpecial ? ANIM_TIMING.anticipationSpecial : ANIM_TIMING.anticipation;
      commit({ phase: 'anticipation', activeTiles: tiles, isAnimating: true, chainLevel: 0 }, token);
      await wait(anticipationMs, timersRef.current);
      if (cancelled()) return;

      // Phase 2: Clearing (with random rotation per tile)
      const clearTiles = tiles.map((t) => ({
        ...t,
        phase: 'clearing' as AnimPhase,
        clearRotate: Math.round((Math.random() - 0.5) * 24), // -12 to 12 degrees
      }));
      commit({ ...workingRef.current, phase: 'clearing', activeTiles: clearTiles }, token);
      onClearStart?.();
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
    commitFn?: () => void,
  ): Promise<void> => {
    if (runningRef.current) {
      // Concurrency guard: a cascade is already animating (e.g. a second word
      // submitted mid-cascade — handleWordAccepted is re-entrant). Skip the
      // OVERLAPPING ANIMATION, but never the grid commit: the engine refs have
      // already advanced to the repaired grid, so dropping commitFn here freezes
      // React state on the stale pre-gravity grid and strands a letterless tile
      // on screen. Snap the board to correct state (no fall tween) instead.
      commitFn?.();
      return;
    }
    runningRef.current = true;
    const token = cancelTokenRef.current;
    const cancelled = () => token !== cancelTokenRef.current;

    try {
      const speed = ANIM_TIMING.chainSpeedFn(chainLevel);

      // Build falling tiles state upfront so we can set it BEFORE the grid commits,
      // preventing the 1-frame flash where tiles appear at destination without animation.
      const fallTiles: TileAnimState[] = gravity.fallingTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'falling' as AnimPhase,
        fallDistance: t.fallDistance, column: t.col,
      }));
      const appearTiles: TileAnimState[] = gravity.newTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'appearing' as AnimPhase,
        spawnOffset: t.spawnOffset, column: t.col,
      }));

      // Pre-set falling + appearing state BEFORE grid commit so tiles render with
      // animation from frame 1. Combine both so new tiles also start hidden.
      const preFallTiles = [...fallTiles, ...appearTiles];
      if (preFallTiles.length > 0) {
        commit({ phase: 'falling', activeTiles: preFallTiles, isAnimating: true, chainLevel }, token);
      }

      // Now commit grid state — tiles move to new positions but CSS --fall-from
      // is already set, so they animate smoothly from their old visual position.
      if (commitFn) commitFn();

      // Phase 0: Anticipation beat — brief dramatic pause before cascade resolves
      if (gravity.clearedTiles.length > 0 && chainLevel >= 1) {
        commit({ phase: 'anticipation', activeTiles: preFallTiles, isAnimating: true, chainLevel }, token);
        await wait(ANIM_TIMING.chainPause * 2 * speed, timersRef.current);
        if (cancelled()) return;
      }

      // Phase 1: Clear cascade-matched tiles. Chain 0's cleared tiles are the word itself, already popped by animateWordClear.
      if (gravity.clearedTiles.length > 0 && chainLevel >= 1) {
        const clearTiles: TileAnimState[] = gravity.clearedTiles.map((t) => ({
          row: t.row, col: t.col, phase: 'clearing' as AnimPhase,
        }));
        commit({ phase: 'clearing', activeTiles: [...clearTiles, ...fallTiles, ...appearTiles], isAnimating: true, chainLevel }, token);
        const clearDur = (ANIM_TIMING.clearing + ANIM_TIMING.clearStagger * gravity.clearedTiles.length) * speed;
        await wait(clearDur, timersRef.current);
        if (cancelled()) return;
        await wait(ANIM_TIMING.pauseAfterClear * speed, timersRef.current);
        if (cancelled()) return;
      }

      // Phase 2: Falling — keep appearTiles in activeTiles so new tiles stay hidden
      // until Phase 3 (prevents 1-frame flash at destination)
      if (gravity.fallingTiles.length > 0) {
        commit({ ...workingRef.current, phase: 'falling', activeTiles: [...fallTiles, ...appearTiles], chainLevel }, token);
        const maxFall = gravity.fallingTiles.reduce((m, t) => Math.max(m, t.fallDistance), 0);
        const fallDur = (ANIM_TIMING.fallBase + ANIM_TIMING.fallPerRow * maxFall) * speed;
        await wait(fallDur, timersRef.current);
        if (cancelled()) return;
      }

      // The grid is final once tiles land, so appear + chain pause play as an unlocked visual tail.
      const landTiles: TileAnimState[] = gravity.fallingTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'landing' as AnimPhase,
        fallDistance: t.fallDistance, column: t.col,
      }));
      const landMs = landTiles.length > 0 ? ANIM_TIMING.landBounce * speed : 0;
      const appearMs = gravity.newTiles.length > 0
        ? (ANIM_TIMING.appearBase + ANIM_TIMING.appearStagger * gravity.newTiles.length) * speed
        : 0;
      const tailMs = Math.max(landMs, appearMs);
      if (tailMs > 0) {
        commit({ phase: appearMs > 0 ? 'appearing' : 'landing', activeTiles: [...landTiles, ...appearTiles], isAnimating: false, chainLevel }, token);
        const seq = commitSeqRef.current;
        timersRef.current.push(setTimeout(() => {
          if (seq === commitSeqRef.current) commit(INITIAL_STATE, token);
        }, tailMs));
      } else {
        commit(INITIAL_STATE, token);
      }
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
