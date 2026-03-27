'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GravityResult } from '../utils/blastGravity';

// ==================== Types ====================

export type AnimPhase = 'idle' | 'anticipation' | 'clearing' | 'falling' | 'appearing' | 'chain_pause';

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

function wait(ms: number, timers: ReturnType<typeof setTimeout>[]): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
    };
  }, []);

  const safeSet = useCallback((updater: (prev: SequencerState) => SequencerState) => {
    if (mountedRef.current) setState(updater);
  }, []);

  const animateWordClear = useCallback(async (
    clearedTiles: Array<{ row: number; col: number; type: string }>,
  ): Promise<void> => {
    const tiles: TileAnimState[] = clearedTiles.map((t) => ({
      row: t.row, col: t.col, phase: 'anticipation' as AnimPhase,
    }));

    // Phase 1: Anticipation
    safeSet(() => ({ phase: 'anticipation', activeTiles: tiles, isAnimating: true, chainLevel: 0 }));
    await wait(ANIM_TIMING.anticipation, timersRef.current);

    // Phase 2: Clearing
    const clearTiles = tiles.map((t) => ({ ...t, phase: 'clearing' as AnimPhase }));
    safeSet((s) => ({ ...s, phase: 'clearing', activeTiles: clearTiles }));
    const clearDur = ANIM_TIMING.clearing + ANIM_TIMING.clearStagger * clearedTiles.length;
    await wait(clearDur, timersRef.current);

    // Done — caller runs cascade next
    safeSet((s) => ({ ...s, phase: 'idle', activeTiles: [], isAnimating: false }));
  }, [safeSet]);

  const animateCascade = useCallback(async (
    gravity: GravityResult,
    chainLevel: number,
  ): Promise<void> => {
    const speed = ANIM_TIMING.chainSpeedFn(chainLevel);

    // Phase 1: Clear cascade-matched tiles
    if (gravity.clearedTiles.length > 0) {
      const clearTiles: TileAnimState[] = gravity.clearedTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'clearing' as AnimPhase,
      }));
      safeSet(() => ({
        phase: 'clearing', activeTiles: clearTiles, isAnimating: true, chainLevel,
      }));
      const clearDur = (ANIM_TIMING.clearing + ANIM_TIMING.clearStagger * gravity.clearedTiles.length) * speed;
      await wait(clearDur, timersRef.current);
      await wait(ANIM_TIMING.pauseAfterClear * speed, timersRef.current);
    }

    // Phase 2: Falling
    if (gravity.fallingTiles.length > 0) {
      const fallTiles: TileAnimState[] = gravity.fallingTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'falling' as AnimPhase,
        fallDistance: t.fallDistance, column: t.col,
      }));
      safeSet((s) => ({ ...s, phase: 'falling', activeTiles: fallTiles, chainLevel }));
      const maxFall = gravity.fallingTiles.reduce((m, t) => Math.max(m, t.fallDistance), 0);
      const fallDur = (ANIM_TIMING.fallBase + ANIM_TIMING.fallPerRow * maxFall + ANIM_TIMING.landBounce) * speed;
      await wait(fallDur, timersRef.current);
    }

    // Phase 3: Appearing
    if (gravity.newTiles.length > 0) {
      const appearTiles: TileAnimState[] = gravity.newTiles.map((t) => ({
        row: t.row, col: t.col, phase: 'appearing' as AnimPhase,
        spawnOffset: t.spawnOffset, column: t.col,
      }));
      safeSet((s) => ({ ...s, phase: 'appearing', activeTiles: appearTiles, chainLevel }));
      const appearDur = (ANIM_TIMING.appearBase + ANIM_TIMING.appearStagger * gravity.newTiles.length) * speed;
      await wait(appearDur, timersRef.current);
    }

    // Phase 4: Chain pause
    safeSet((s) => ({ ...s, phase: 'chain_pause', activeTiles: [], chainLevel }));
    await wait(ANIM_TIMING.chainPause * speed, timersRef.current);

    // Done
    safeSet(() => INITIAL_STATE);
  }, [safeSet]);

  const reset = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    setState(INITIAL_STATE);
  }, []);

  return { state, animateWordClear, animateCascade, reset };
}
