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
  clear: { duration: 200, stagger: 6, easing: 'cubicBezier(0.55, 0, 1, 0.45)' },
  /** Inter-phase pause — creates a "heartbeat" rhythm between cascade steps.
   * Research: 80-100ms gap lets the brain register each step separately (flow state). */
  pauseBeforeFall: 80,
  fall: { baseDuration: 180, perRowDuration: 40, easing: 'cubicBezier(0.34, 1.56, 0.64, 1)' },
  appear: { duration: 160, stagger: 8, easing: 'cubicBezier(0.22, 1, 0.36, 1)' },
  buffer: 20, // safety margin (ms)
} as const;

/**
 * Momentum multiplier — each cascade chain link gets progressively faster.
 * Chain 0 (player word) = 1.0x, Chain 1 = 0.85x, Chain 2 = 0.7x, Chain 3+ = 0.6x minimum.
 * This creates the "pinball rolling downhill" feeling where cascades accelerate.
 */
function chainSpeedMultiplier(chainLevel: number): number {
  return Math.max(0.6, 1 - chainLevel * 0.15);
}

/** Calculate actual phase duration from tile counts, with chain-aware acceleration */
function calcPhaseDurations(
  clearedCount: number,
  fallingTiles: FallingTile[],
  newCount: number,
  chainLevel = 0,
): { clear: number; fall: number; appear: number } {
  const speed = chainSpeedMultiplier(chainLevel);

  // Clearing: duration + stagger from center (half the count)
  const clear = clearedCount > 0
    ? (BLAST_ANIM.clear.duration + BLAST_ANIM.clear.stagger * Math.ceil(clearedCount / 2)) * speed + BLAST_ANIM.buffer
    : 0;

  // Falling: per-element duration proportional to fall distance (like gravity)
  const maxFallDist = fallingTiles.reduce((max, t) => Math.max(max, t.fallDistance), 0);
  const fall = maxFallDist > 0
    ? (BLAST_ANIM.fall.baseDuration + BLAST_ANIM.fall.perRowDuration * maxFallDist) * speed + BLAST_ANIM.buffer
    : 0;

  // Appearing: duration + stagger per tile
  const appear = newCount > 0
    ? (BLAST_ANIM.appear.duration + BLAST_ANIM.appear.stagger * Math.max(newCount - 1, 0)) * speed + BLAST_ANIM.buffer
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
    /** Current cascade chain level — higher = faster animations (momentum) */
    chainLevel?: number,
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
    chainLevel = 0,
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

    // Calculate durations from actual tile data (chain-aware: higher chain = faster)
    const timing = calcPhaseDurations(
      result.clearedTiles.length,
      result.fallingTiles,
      result.newTiles.length,
      chainLevel,
    );

    setAnimationData({
      clearedTiles: result.clearedTiles,
      fallingTiles: result.fallingTiles,
      newTiles: result.newTiles,
    });

    // Phase 1: Clearing
    setCascadePhase('clearing');

    // Use cumulative delays (flat scheduling) instead of nested timeouts
    // to avoid timer drift from nested setTimeout chains.
    // pauseBeforeFall creates a "heartbeat" gap between clear and fall for rhythm.
    const pause = BLAST_ANIM.pauseBeforeFall;

    const t1 = setTimeout(() => {
      setCascadePhase('falling');
    }, timing.clear + pause);

    const t2 = setTimeout(() => {
      setCascadePhase('appearing');
    }, timing.clear + pause + timing.fall);

    const t3 = setTimeout(() => {
      setCascadePhase('idle');
      setAnimationData(null);
      onComplete(result.newGrid, result.newTileStates, affectedColumns);
    }, timing.clear + pause + timing.fall + timing.appear);

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
