'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { detectNearMiss } from '../utils/blastNearMiss';
import type { BlastTileState } from '../types';

// ==================== Types ====================

interface UseBlastNearMissReturn {
  /** Cells currently pulsing with near-miss shimmer (empty = no shimmer) */
  shimmerCells: Array<{ row: number; col: number }>;
  /**
   * Run near-miss detection after a word is accepted.
   * Auto-clears shimmerCells after 1500ms.
   */
  check: (
    path: Array<{ row: number; col: number }>,
    grid: string[][],
    tileStates: BlastTileState[][],
    gridSize: number,
    hadCombo?: boolean,
  ) => void;
}

// ==================== Hook ====================

/**
 * useBlastNearMiss — Manages shimmer state for near-miss opportunities.
 *
 * After a word is accepted, call check() with the path + board state.
 * If a near-miss is detected, shimmerCells will be populated for 1500ms
 * then auto-cleared.
 */
export function useBlastNearMiss(): UseBlastNearMissReturn {
  const [shimmerCells, setShimmerCells] = useState<Array<{ row: number; col: number }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const check = useCallback(
    (
      path: Array<{ row: number; col: number }>,
      grid: string[][],
      tileStates: BlastTileState[][],
      gridSize: number,
      hadCombo: boolean = false,
    ) => {
      // Clear any existing timer before starting a new one
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const result = detectNearMiss(path, grid, tileStates, gridSize, hadCombo);
      if (!result) {
        setShimmerCells([]);
        return;
      }

      setShimmerCells(result.cells);

      timerRef.current = setTimeout(() => {
        setShimmerCells([]);
        timerRef.current = null;
      }, 1500);
    },
    [],
  );

  return { shimmerCells, check };
}
