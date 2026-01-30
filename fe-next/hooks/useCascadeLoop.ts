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

/** Common English letters weighted by frequency for tile generation */
const LETTER_FREQUENCY = 'EEEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOIIIIIINNNNNSSSSSHHHHHRRRRRLDDDCCUUMMWFGYPBVKJXQZ';

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
        // This tile has cleared tiles below it, so it will fall
        const tileId = `${row}-${col}`;
        fallingTiles.set(tileId, clearedBelow);
      }
    }
  }

  return fallingTiles;
}

/**
 * Generate new tiles for all cleared spaces
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
      if (tile.isCleared) {
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
export function checkForMatches(tiles: TileState[][]): boolean {
  // MVP: Always return false (no auto-cascade)
  // Future enhancement: Implement word matching logic
  return false;
}

/**
 * Generate a random letter weighted by English frequency
 */
function getRandomLetter(): string {
  const index = Math.floor(Math.random() * LETTER_FREQUENCY.length);
  return LETTER_FREQUENCY[index];
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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tilesRef = useRef<TileState[][]>([]);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phaseDuration = prefersReducedMotion ? 0 : PHASE_DURATION_MS;

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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  // Phase transition effects
  useEffect(() => {
    if (onPhaseChange) {
      onPhaseChange(state.phase);
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set up next phase transition
    switch (state.phase) {
      case 'removing':
        // After removing phase, transition to falling
        timeoutRef.current = setTimeout(() => {
          const fallingTiles = applyGravity(tilesRef.current);
          dispatch({ type: 'TRANSITION_FALLING', payload: fallingTiles });
        }, phaseDuration);
        break;

      case 'falling':
        // After falling phase, transition to spawning
        timeoutRef.current = setTimeout(() => {
          const gridSize = tilesRef.current.length;
          const spawningTiles = spawnNewTiles(tilesRef.current, gridSize);
          dispatch({ type: 'TRANSITION_SPAWNING', payload: spawningTiles });
        }, phaseDuration);
        break;

      case 'spawning':
        // After spawning phase, transition to checking
        timeoutRef.current = setTimeout(() => {
          dispatch({ type: 'TRANSITION_CHECKING' });
        }, phaseDuration);
        break;

      case 'checking':
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

      default:
        // idle phase, no transition needed
        break;
    }

    // Cleanup on unmount or phase change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state.phase, state.iteration, onPhaseChange, phaseDuration]);

  return {
    state,
    startCascade,
    reset,
  };
}
