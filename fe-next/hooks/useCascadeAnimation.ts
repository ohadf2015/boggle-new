/**
 * useCascadeAnimation Hook
 *
 * Manages cascade animation delays for chain tile reactions.
 * Provides wave and burst patterns for staggered tile animations.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ==============================================
// TYPES
// ==============================================

/**
 * Configuration for cascade animation
 */
export interface CascadeConfig {
  /** Chain tile position (origin of cascade) */
  origin: { row: number; col: number };
  /** Tile indices to animate */
  affectedIndices: number[];
  /** Grid dimension (4, 5, 6, or 7) */
  gridSize: number;
  /** Delay per tile in ms (default: 50ms for chain, 30ms regular) */
  staggerMs?: number;
  /** Pattern type: wave radiates from origin, burst is sequential */
  animationType?: 'wave' | 'burst';
}

/**
 * Result of cascade delay calculation
 */
export interface CascadeResult {
  /** Map of tileIndex to delay in ms */
  delays: Map<number, number>;
  /** Total animation time */
  totalDuration: number;
  /** Maximum individual delay */
  maxDelay: number;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Convert tile index to grid coordinates
 */
function indexToCoords(index: number, gridSize: number): { row: number; col: number } {
  return {
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  };
}

/**
 * Calculate Manhattan distance between two grid positions
 */
function manhattanDistance(
  a: { row: number; col: number },
  b: { row: number; col: number }
): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// ==============================================
// EXPORTED FUNCTIONS
// ==============================================

/**
 * Calculate cascade animation delays for affected tiles
 *
 * Wave pattern: Distance-based delays radiating from origin
 * Burst pattern: Sequential delays in array order
 *
 * @param config - Cascade configuration
 * @returns Map of tile indices to delays and timing info
 */
export function calculateCascadeDelays(config: CascadeConfig): CascadeResult {
  const {
    origin,
    affectedIndices,
    gridSize,
    staggerMs = 50,
    animationType = 'wave',
  } = config;

  const delays = new Map<number, number>();

  if (animationType === 'wave') {
    // Wave pattern: delays based on Manhattan distance from origin
    for (const idx of affectedIndices) {
      const coords = indexToCoords(idx, gridSize);
      const distance = manhattanDistance(origin, coords);
      const delay = distance * staggerMs;
      delays.set(idx, delay);
    }
  } else if (animationType === 'burst') {
    // Burst pattern: sequential delays
    affectedIndices.forEach((idx, i) => {
      delays.set(idx, i * staggerMs);
    });
  }

  // Calculate max delay and total duration
  let maxDelay = 0;
  for (const delay of delays.values()) {
    if (delay > maxDelay) {
      maxDelay = delay;
    }
  }

  return {
    delays,
    totalDuration: maxDelay,
    maxDelay,
  };
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for managing cascade animation state
 *
 * Provides functions to trigger cascade animations and track state.
 * Auto-clears delays after animation completes.
 *
 * @returns Cascade animation controls and state
 */
export function useCascadeAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [delays, setDelays] = useState<Map<number, number>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start cascade animation with given configuration
   */
  const startCascade = useCallback((config: CascadeConfig) => {
    const result = calculateCascadeDelays(config);
    setDelays(result.delays);
    setIsAnimating(true);

    // Auto-cleanup after totalDuration
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, result.totalDuration + 10); // +10ms buffer for animation completion
  }, []);

  /**
   * Reset cascade state
   */
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsAnimating(false);
    setDelays(new Map());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    startCascade,
    delays,
    isAnimating,
    reset,
  };
}
