/**
 * useCascadeLoop Hook - Cascade State Machine
 *
 * Manages the "match -> remove -> gravity -> spawn -> re-check" cycle
 * for Candy Crush style cascading effects when words are removed.
 *
 * Phase Timing:
 * - REMOVING: 250ms (tiles fade out)
 * - FALLING: 250ms (tiles fall into empty spaces)
 * - SPAWNING: 250ms (new tiles spawn and fall in)
 * - CHECKING: instant (check for matches, loop or return to idle)
 *
 * PERFORMANCE NOTE:
 * Uses requestAnimationFrame with timestamp-based transitions instead of setTimeout.
 * This prevents timer drift during heavy touch interactions on mobile devices,
 * matching the approach used in useGameTimer for accuracy under load.
 *
 * MVP Limitation (BOARD-05):
 * checkForMatches always returns false (single cascade only).
 * Future enhancement: Implement match detection for continuous cascades.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { TileState } from '@/types/adventure';

// ==============================================
// CONSTANTS
// ==============================================

/** Maximum cascade iterations before forced stop (safety limit) */
const MAX_CASCADE_ITERATIONS = 10;

/** Duration of each cascade phase in milliseconds */
const PHASE_DURATION_MS = 250;

// Letter frequency moved to gridGenerator.ts — removed dead code here

// ==============================================
// TYPES
// ==============================================

/**
 * Cascade phase in the state machine
 */
export type CascadePhase = 'idle' | 'removing' | 'falling' | 'spawning' | 'checking';

/**
 * Cascade state machine state
 */
export interface CascadeState {
  /** Current phase in the cascade */
  phase: CascadePhase;
  /** True when any phase is active (blocks input) */
  isProcessing: boolean;
  /** Current cascade iteration (for safety limit) */
  iteration: number;
  /** Tile IDs to remove */
  pendingRemovals: Set<string>;
  /** Map of tile ID -> fall distance in rows */
  fallingTiles: Map<string, number>;
  /** New tile IDs being spawned */
  spawningTiles: string[];
}

/**
 * Options for useCascadeLoop hook
 */
export interface CascadeLoopOptions {
  /** Callback fired when phase changes */
  onPhaseChange?: (phase: CascadePhase) => void;
}

// ==============================================
// STATE MACHINE ACTIONS
// ==============================================

type CascadeAction =
  | { type: 'START_CASCADE'; payload: string[] }
  | { type: 'TRANSITION_FALLING'; payload: Map<string, number> }
  | { type: 'TRANSITION_SPAWNING'; payload: string[] }
  | { type: 'TRANSITION_CHECKING' }
  | { type: 'TRANSITION_IDLE' }
  | { type: 'RESET' };

/**
 * Reducer for cascade state machine
 */
function cascadeReducer(state: CascadeState, action: CascadeAction): CascadeState {
  switch (action.type) {
    case 'START_CASCADE':
      // Safety limit: stop if too many iterations
      if (state.iteration >= MAX_CASCADE_ITERATIONS) {
        return {
          ...state,
          phase: 'idle',
          isProcessing: false,
        };
      }

      return {
        ...state,
        phase: 'removing',
        isProcessing: true,
        iteration: state.iteration + 1,
        pendingRemovals: new Set(action.payload),
        fallingTiles: new Map(),
        spawningTiles: [],
      };

    case 'TRANSITION_FALLING':
      return {
        ...state,
        phase: 'falling',
        fallingTiles: action.payload,
      };

    case 'TRANSITION_SPAWNING':
      return {
        ...state,
        phase: 'spawning',
        spawningTiles: action.payload,
      };

    case 'TRANSITION_CHECKING':
      return {
        ...state,
        phase: 'checking',
      };

    case 'TRANSITION_IDLE':
      return {
        ...state,
        phase: 'idle',
        isProcessing: false,
        pendingRemovals: new Set<string>(),
        fallingTiles: new Map<string, number>(),
        spawningTiles: [],
      };

    case 'RESET':
      return {
        phase: 'idle',
        isProcessing: false,
        iteration: 0,
        pendingRemovals: new Set(),
        fallingTiles: new Map(),
        spawningTiles: [],
      };

    default:
      return state;
  }
}

// ==============================================
// PURE FUNCTIONS (EXPORTED)
// ==============================================

/**
 * Calculate which tiles fall and how far after removals
 *
 * Special Tile Behavior:
 * - Frozen tiles (isFrozen=true) stay in place and do NOT fall
 *
 * @param tiles - Current grid state
 * @returns Map of tile ID (row-col) to fall distance in rows
 */
export function applyGravity(tiles: TileState[][]): Map<string, number> {
  const fallingTiles = new Map<string, number>();
  const gridSize = tiles.length;
  if (gridSize === 0) return fallingTiles;

  // For each column, count cleared tiles below each tile
  for (let col = 0; col < gridSize; col++) {
    let clearedBelow = 0;

    // Iterate from bottom to top
    for (let row = gridSize - 1; row >= 0; row--) {
      const rowData = tiles[row];
      if (!rowData || !rowData[col]) continue; // Safety check for sparse grids

      const tile = rowData[col];

      if (tile.isCleared) {
        clearedBelow++;
      } else if (clearedBelow > 0) {
        // SPECIAL TILE CHECK: Frozen tiles stay in place (skip gravity)
        if (!tile.isFrozen) {
          // This tile has cleared tiles below it, so it will fall
          const tileId = `${row}-${col}`;
          fallingTiles.set(tileId, clearedBelow);
        }
      }
    }
  }

  return fallingTiles;
}

/**
 * Generate new tiles for all cleared spaces
 *
 * Special Tile Behavior:
 * - Locked tiles (type='locked') block spawning in their position
 * - Only spawn tiles in positions that are cleared AND not blocked by locked tiles
 *
 * @param tiles - Current grid state
 * @param gridSize - Grid dimension
 * @returns Array of tile IDs for newly spawned tiles
 */
export function spawnNewTiles(tiles: TileState[][], gridSize: number): string[] {
  const spawningTiles: string[] = [];

  // Find all cleared tiles that need replacement
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const tile = tiles[row][col];

      // SPECIAL TILE CHECK: Skip spawning in positions with locked tiles
      if (tile.isCleared && tile.type !== 'locked') {
        spawningTiles.push(`${row}-${col}`);
      }
    }
  }

  return spawningTiles;
}

/**
 * Check if the grid has any new word matches after cascade
 *
 * MVP LIMITATION (BOARD-05):
 * Always returns false. Match detection requires word validation integration,
 * which is deferred to avoid scope creep. Single cascade only for MVP.
 *
 * TODO: Implement match detection for continuous cascades in future phase
 *
 * @param tiles - Current grid state
 * @returns True if matches found, false otherwise
 */
export function checkForMatches(_tiles: TileState[][]): boolean {
  // MVP: Always return false (no auto-cascade)
  // Future enhancement: Implement word matching logic
  return false;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for managing cascade loop state machine
 *
 * Provides functions to trigger cascades and manages phase transitions.
 * Blocks input during cascade via isProcessing flag.
 *
 * Uses requestAnimationFrame with timestamp-based transitions for accuracy
 * during heavy touch interactions (prevents drift that setTimeout can cause).
 *
 * @param options - Configuration options
 * @returns Cascade controls and state
 */
export function useCascadeLoop(options: CascadeLoopOptions = {}) {
  const { onPhaseChange } = options;

  const [state, dispatch] = useReducer(cascadeReducer, {
    phase: 'idle',
    isProcessing: false,
    iteration: 0,
    pendingRemovals: new Set<string>(),
    fallingTiles: new Map<string, number>(),
    spawningTiles: [],
  });

  // Refs for timestamp-based transitions
  const animationFrameRef = useRef<number | null>(null);
  const phaseStartTimeRef = useRef<number | null>(null);
  const tilesRef = useRef<TileState[][]>([]);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phaseDuration = prefersReducedMotion ? 0 : PHASE_DURATION_MS;

  /**
   * Update the tiles reference so gravity/spawn calculations use real grid data.
   * Must be called whenever the tile grid changes (after SUBMIT_WORD, etc.).
   */
  const updateTiles = useCallback((tiles: TileState[][]) => {
    tilesRef.current = tiles;
  }, []);

  /**
   * Start a new cascade with the given removed tiles
   */
  const startCascade = useCallback(
    (tilesRemoved: string[]) => {
      dispatch({ type: 'START_CASCADE', payload: tilesRemoved });
    },
    []
  );

  /**
   * Reset cascade state immediately
   */
  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    phaseStartTimeRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  // Phase transition effects using requestAnimationFrame for accuracy
  useEffect(() => {
    if (onPhaseChange) {
      onPhaseChange(state.phase);
    }

    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Handle phase-specific transitions
    switch (state.phase) {
      case 'removing':
      case 'falling':
      case 'spawning': {
        // Start timestamp-based transition
        phaseStartTimeRef.current = performance.now();

        const tick = () => {
          if (phaseStartTimeRef.current === null) return;

          const elapsed = performance.now() - phaseStartTimeRef.current;

          if (elapsed >= phaseDuration) {
            // Phase duration complete - transition to next phase
            phaseStartTimeRef.current = null;

            if (state.phase === 'removing') {
              const fallingTiles = applyGravity(tilesRef.current);
              dispatch({ type: 'TRANSITION_FALLING', payload: fallingTiles });
            } else if (state.phase === 'falling') {
              const gridSize = tilesRef.current.length;
              const spawningTiles = spawnNewTiles(tilesRef.current, gridSize);
              dispatch({ type: 'TRANSITION_SPAWNING', payload: spawningTiles });
            } else if (state.phase === 'spawning') {
              dispatch({ type: 'TRANSITION_CHECKING' });
            }
          } else {
            // Continue waiting
            animationFrameRef.current = requestAnimationFrame(tick);
          }
        };

        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(tick);
        break;
      }

      case 'checking': {
        // Check for matches (MVP: always false)
        const hasMatches = checkForMatches(tilesRef.current);
        if (hasMatches && state.iteration < MAX_CASCADE_ITERATIONS) {
          // Would start new cascade here in future
          // For MVP, this never happens
          dispatch({ type: 'TRANSITION_IDLE' });
        } else {
          // No matches or hit safety limit, return to idle
          dispatch({ type: 'TRANSITION_IDLE' });
        }
        break;
      }

      default:
        // idle phase, no transition needed
        break;
    }

    // Cleanup on unmount or phase change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [state.phase, state.iteration, onPhaseChange, phaseDuration]);

  return {
    state,
    startCascade,
    updateTiles,
    reset,
  };
}
