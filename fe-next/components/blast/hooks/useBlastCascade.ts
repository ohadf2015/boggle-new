'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState } from '../types';
import { computeGravityResult, type ClearedTile, type FallingTile, type NewTile } from '../utils/blastGravity';
import { createSeededRandom } from '../utils/blastLetterGenerator';

// ==================== Types ====================

export type BlastCascadePhase = 'idle' | 'clearing' | 'falling' | 'appearing';

export interface CascadeAnimationData {
  clearedTiles: ClearedTile[];
  fallingTiles: FallingTile[];
  newTiles: NewTile[];
}

// ==================== Animation Config ====================
// Shared between this hook (timing) and BlastCascadeOverlay (animation params).

export const BLAST_ANIM = {
  clear: { duration: 280, stagger: 12, easing: 'easeInQuart' },
  fall: { baseDuration: 160, perRowDuration: 60, easing: 'easeInCubic' },
  appear: { duration: 200, stagger: 14, easing: 'easeOutBack' },
  buffer: 30, // safety margin (ms)
} as const;

/** Calculate actual phase duration from tile counts */
function calcPhaseDurations(
  clearedCount: number,
  fallingTiles: FallingTile[],
  newCount: number,
): { clear: number; fall: number; appear: number } {
  // Clearing: duration + stagger from center (half the count)
  const clear = clearedCount > 0
    ? BLAST_ANIM.clear.duration + BLAST_ANIM.clear.stagger * Math.ceil(clearedCount / 2) + BLAST_ANIM.buffer
    : 0;

  // Falling: per-element duration proportional to fall distance (like gravity)
  const maxFallDist = fallingTiles.reduce((max, t) => Math.max(max, t.fallDistance), 0);
  const fall = maxFallDist > 0
    ? BLAST_ANIM.fall.baseDuration + BLAST_ANIM.fall.perRowDuration * maxFallDist + BLAST_ANIM.buffer
    : 0;

  // Appearing: duration + stagger per tile
  const appear = newCount > 0
    ? BLAST_ANIM.appear.duration + BLAST_ANIM.appear.stagger * Math.max(newCount - 1, 0) + BLAST_ANIM.buffer
    : 0;

  return { clear, fall, appear };
}

// ==================== Hook ====================

interface UseBlastCascadeOptions {
  gridSize: number;
  language: Language;
  specialTileChance: number;
  /** Custom special tile distribution (overrides default). Used by wave system. */
  customDistribution?: Record<string, number>;
  /** Respect prefers-reduced-motion */
  reducedMotion?: boolean;
  /**
   * Seed for deterministic multiplayer refills.
   * When provided (from server via BlastModeState.seed), a seeded RNG is created
   * via createSeededRandom(blastSeed) and passed to computeGravityResult.
   * Singleplayer: omit or leave null — defaults to Math.random.
   * NOTE: Each cascade creates a NEW seeded RNG from the same seed to ensure
   *       cross-client determinism when they process the same cascade event.
   */
  blastSeed?: number | null;
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
    onComplete: (newGrid: LetterGrid, newTileStates: BlastTileState[][], affectedColumns: number[]) => void,
    /** Optional DDA spawn modifier — passed to rollSpecialType during refill */
    spawnModifier?: number,
  ) => void;
}

/**
 * useBlastCascade - State machine for blast mode gravity cascade.
 *
 * Phases:
 * 1. clearing: cleared tiles shrink/explode (dynamic duration)
 * 2. falling: remaining tiles fall with gravity (duration scales with fall distance)
 * 3. appearing: new tiles pop in from top (dynamic duration)
 * 4. idle: cascade complete, grid updated
 *
 * Phase durations are calculated dynamically from actual tile counts
 * to stay synchronized with anime.js animations in BlastCascadeOverlay.
 */
export function useBlastCascade({
  gridSize,
  language,
  specialTileChance,
  customDistribution,
  reducedMotion = false,
  blastSeed = null,
}: UseBlastCascadeOptions): UseBlastCascadeReturn {
  const [cascadePhase, setCascadePhase] = useState<BlastCascadePhase>('idle');
  const [animationData, setAnimationData] = useState<CascadeAnimationData | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clean up all pending timers
  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  // Clean up on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const startCascade = useCallback((
    grid: LetterGrid,
    tileStates: BlastTileState[][],
    onComplete: (newGrid: LetterGrid, newTileStates: BlastTileState[][], affectedColumns: number[]) => void,
    spawnModifier = 0,
  ) => {
    // Clear any in-flight timers from a previous cascade
    clearTimers();

    // Create seeded RNG for deterministic multiplayer refills when seed is available.
    // Each cascade creates a fresh RNG from the same seed so all clients produce
    // the same tiles for the same cascade event (reduced divergence, not lockstep).
    const rng = blastSeed != null ? createSeededRandom(blastSeed) : undefined;

    // Compute gravity result upfront (pure function)
    const result = computeGravityResult(grid, tileStates, gridSize, language, specialTileChance, customDistribution, spawnModifier, rng);

    // Columns that received new tiles (these are the only ones worth scanning for cascade words)
    const affectedColumns = [...new Set(result.newTiles.map(t => t.col))];

    // For reduced motion, skip animation entirely
    if (reducedMotion) {
      onComplete(result.newGrid, result.newTileStates, affectedColumns);
      return;
    }

    // Calculate durations from actual tile data
    const timing = calcPhaseDurations(
      result.clearedTiles.length,
      result.fallingTiles,
      result.newTiles.length,
    );

    setAnimationData({
      clearedTiles: result.clearedTiles,
      fallingTiles: result.fallingTiles,
      newTiles: result.newTiles,
    });

    // Phase 1: Clearing
    setCascadePhase('clearing');

    // Use cumulative delays (flat scheduling) instead of nested timeouts
    // to avoid timer drift from nested setTimeout chains
    const t1 = setTimeout(() => {
      setCascadePhase('falling');
    }, timing.clear);

    const t2 = setTimeout(() => {
      setCascadePhase('appearing');
    }, timing.clear + timing.fall);

    const t3 = setTimeout(() => {
      setCascadePhase('idle');
      setAnimationData(null);
      onComplete(result.newGrid, result.newTileStates, affectedColumns);
    }, timing.clear + timing.fall + timing.appear);

    timersRef.current = [t1, t2, t3];
  }, [gridSize, language, specialTileChance, customDistribution, reducedMotion, blastSeed, clearTimers]);

  const isAnimating = cascadePhase !== 'idle';

  return {
    cascadePhase,
    isAnimating,
    animationData,
    startCascade,
  };
}
