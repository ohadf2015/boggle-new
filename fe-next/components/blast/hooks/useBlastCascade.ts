'use client';

import { useState, useCallback, useRef } from 'react';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState } from '../types';
import { computeGravityResult, type ClearedTile, type FallingTile, type NewTile } from '../utils/blastGravity';

// ==================== Types ====================

export type BlastCascadePhase = 'idle' | 'clearing' | 'falling' | 'appearing';

export interface CascadeAnimationData {
  clearedTiles: ClearedTile[];
  fallingTiles: FallingTile[];
  newTiles: NewTile[];
}

/** Timing constants (ms) */
export const BLAST_CASCADE_TIMING = {
  clear: 300,
  fall: 400,
  appear: 300,
} as const;

// ==================== Hook ====================

interface UseBlastCascadeOptions {
  gridSize: number;
  language: Language;
  specialTileChance: number;
  /** Respect prefers-reduced-motion */
  reducedMotion?: boolean;
}

export interface UseBlastCascadeReturn {
  /** Current cascade phase */
  cascadePhase: BlastCascadePhase;
  /** Whether cascade is in progress (blocks input) */
  isAnimating: boolean;
  /** Animation data for the overlay to render */
  animationData: CascadeAnimationData | null;
  /** Start a cascade after tiles are cleared */
  startCascade: (
    grid: LetterGrid,
    tileStates: BlastTileState[][],
    onComplete: (newGrid: LetterGrid, newTileStates: BlastTileState[][]) => void
  ) => void;
}

/**
 * useBlastCascade - State machine for blast mode gravity cascade.
 *
 * Phases:
 * 1. clearing (300ms): cleared tiles shrink/explode
 * 2. falling (400ms): remaining tiles fall down with spring physics
 * 3. appearing (300ms): new tiles pop in from top
 * 4. idle: cascade complete, grid updated
 *
 * Uses anime.js via the BlastCascadeOverlay component for actual animations.
 * This hook only manages phase timing and grid state transitions.
 */
export function useBlastCascade({
  gridSize,
  language,
  specialTileChance,
  reducedMotion = false,
}: UseBlastCascadeOptions): UseBlastCascadeReturn {
  const [cascadePhase, setCascadePhase] = useState<BlastCascadePhase>('idle');
  const [animationData, setAnimationData] = useState<CascadeAnimationData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCascade = useCallback((
    grid: LetterGrid,
    tileStates: BlastTileState[][],
    onComplete: (newGrid: LetterGrid, newTileStates: BlastTileState[][]) => void
  ) => {
    const timing = reducedMotion
      ? { clear: 0, fall: 0, appear: 0 }
      : BLAST_CASCADE_TIMING;

    // Compute gravity result upfront (pure function)
    const result = computeGravityResult(grid, tileStates, gridSize, language, specialTileChance);

    setAnimationData({
      clearedTiles: result.clearedTiles,
      fallingTiles: result.fallingTiles,
      newTiles: result.newTiles,
    });

    // Phase 1: Clearing
    setCascadePhase('clearing');

    timerRef.current = setTimeout(() => {
      // Phase 2: Falling
      setCascadePhase('falling');

      timerRef.current = setTimeout(() => {
        // Phase 3: Appearing
        setCascadePhase('appearing');

        timerRef.current = setTimeout(() => {
          // Phase 4: Complete - update grid state
          setCascadePhase('idle');
          setAnimationData(null);
          onComplete(result.newGrid, result.newTileStates);
        }, timing.appear);
      }, timing.fall);
    }, timing.clear);
  }, [gridSize, language, specialTileChance, reducedMotion]);

  const isAnimating = cascadePhase !== 'idle';

  return {
    cascadePhase,
    isAnimating,
    animationData,
    startCascade,
  };
}
