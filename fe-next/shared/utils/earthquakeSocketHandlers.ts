/**
 * Shared Earthquake Socket Handlers
 * Used by both host and player to handle earthquake/fire-round socket events
 *
 * Consolidates duplicate handler logic from:
 * - host/hooks/socket/useHostGameEvents.ts
 * - player/hooks/socket/usePlayerGameEvents.ts
 */
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { LetterGrid } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import logger from '@/utils/logger';

// ==================== Types ====================

interface EarthquakeHandlerDeps {
  setEarthquakeState: Dispatch<SetStateAction<EarthquakeState>>;
  setFireRoundActive: Dispatch<SetStateAction<boolean>>;
  setFireRoundRemaining: Dispatch<SetStateAction<number>>;
  /** Used by player (from GameStateContext) */
  setLetterGrid?: Dispatch<SetStateAction<LetterGrid | null>>;
  /** Used by host (from local state) */
  setTableData?: Dispatch<SetStateAction<LetterGrid | null>>;
  /** Also update tableDataRef for host */
  tableDataRef?: MutableRefObject<LetterGrid | null>;
  gameSessionIdRef: MutableRefObject<number>;
  role: 'HOST' | 'PLAYER';
}

interface EarthquakeEventData {
  gameSessionId?: number;
}

interface FireRoundStartData extends EarthquakeEventData {
  grid?: LetterGrid;
  duration?: number;
}

interface EarthquakeSocketHandlers {
  handleEarthquakeWarning: (data: EarthquakeEventData) => void;
  handleEarthquakeShake: (data: EarthquakeEventData) => void;
  handleFireRoundStart: (data: FireRoundStartData) => void;
  handleFireRoundEnd: (data: EarthquakeEventData) => void;
  cleanup: () => void;
}

// ==================== Implementation ====================

// Track active fire round countdown interval per handler instance
// Using WeakMap to allow garbage collection when handlers are cleaned up
const fireRoundIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Creates earthquake socket event handlers for host or player
 *
 * @param deps - Dependencies including state setters and refs
 * @returns Object with handlers to register on socket and cleanup function
 *
 * @example
 * const handlers = createEarthquakeSocketHandlers({
 *   setEarthquakeState,
 *   setFireRoundActive,
 *   setFireRoundRemaining,
 *   setLetterGrid, // for player
 *   gameSessionIdRef,
 *   role: 'PLAYER',
 * });
 *
 * socket.on('earthquakeWarning', handlers.handleEarthquakeWarning);
 * // ... register other handlers
 *
 * // On cleanup:
 * handlers.cleanup();
 */
export function createEarthquakeSocketHandlers(deps: EarthquakeHandlerDeps): EarthquakeSocketHandlers {
  const {
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    setLetterGrid,
    setTableData,
    tableDataRef,
    gameSessionIdRef,
    role,
  } = deps;

  // Use whichever grid setter is available
  const setGrid = setLetterGrid || setTableData;

  // Unique ID for this handler instance to manage its interval
  const handlerId = `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  /**
   * Clear any existing fire round countdown for this handler
   */
  const clearFireRoundInterval = () => {
    const existingInterval = fireRoundIntervals.get(handlerId);
    if (existingInterval) {
      clearInterval(existingInterval);
      fireRoundIntervals.delete(handlerId);
    }
  };

  /**
   * Check if event is from current game session (not stale)
   */
  const isCurrentSession = (data: EarthquakeEventData): boolean => {
    if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
      logger.log(`[${role}] Ignoring stale earthquake event from old session:`, data.gameSessionId);
      return false;
    }
    return true;
  };

  /**
   * Handle earthquake warning phase (2 seconds before shake)
   */
  const handleEarthquakeWarning = (data: EarthquakeEventData): void => {
    if (!isCurrentSession(data)) return;
    logger.log(`[${role}] Earthquake warning received`);
    setEarthquakeState('warning');
  };

  /**
   * Handle earthquake shake phase (1 second of shaking)
   */
  const handleEarthquakeShake = (data: EarthquakeEventData): void => {
    if (!isCurrentSession(data)) return;
    logger.log(`[${role}] Earthquake shake received`);
    setEarthquakeState('shaking');
  };

  /**
   * Handle fire round start (new grid, 2x multiplier for 15 seconds)
   */
  const handleFireRoundStart = (data: FireRoundStartData): void => {
    if (!isCurrentSession(data)) return;
    logger.log(`[${role}] Fire round started - grid:`, data.grid);

    // Clear any existing countdown
    clearFireRoundInterval();

    // Update grid with new fire round grid
    if (data.grid) {
      if (setGrid) {
        setGrid(data.grid);
      }
      // Also update tableDataRef for host (used in callbacks)
      if (tableDataRef) {
        tableDataRef.current = data.grid;
      }
    }

    setEarthquakeState('fire-round');
    setFireRoundActive(true);
    const duration = data.duration || 15;
    setFireRoundRemaining(duration);

    // Start countdown for fire round remaining time display
    let remaining = duration;
    const intervalId = setInterval(() => {
      remaining -= 1;
      setFireRoundRemaining(remaining);
      if (remaining <= 0) {
        clearFireRoundInterval();
      }
    }, 1000);

    fireRoundIntervals.set(handlerId, intervalId);
  };

  /**
   * Handle fire round end (back to normal gameplay)
   */
  const handleFireRoundEnd = (data: EarthquakeEventData): void => {
    if (!isCurrentSession(data)) return;
    logger.log(`[${role}] Fire round ended`);

    // Clear countdown
    clearFireRoundInterval();

    setEarthquakeState('idle');
    setFireRoundActive(false);
    setFireRoundRemaining(0);
  };

  /**
   * Cleanup function - call when unmounting or cleaning up socket listeners
   */
  const cleanup = (): void => {
    clearFireRoundInterval();
  };

  return {
    handleEarthquakeWarning,
    handleEarthquakeShake,
    handleFireRoundStart,
    handleFireRoundEnd,
    cleanup,
  };
}
