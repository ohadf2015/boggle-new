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
  /**
   * Ref to store fire round interval ID - MUST be provided by the calling component
   * This ensures the interval persists across handler recreations (e.g., when useEffect re-runs)
   */
  fireRoundIntervalRef: MutableRefObject<NodeJS.Timeout | null>;
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

/**
 * Creates earthquake socket event handlers for host or player
 *
 * IMPORTANT: The fireRoundIntervalRef MUST be created with useRef in the calling component.
 * This ensures the interval ID persists across handler recreations, which happens when
 * the useEffect that registers socket listeners re-runs due to dependency changes.
 *
 * @param deps - Dependencies including state setters and refs
 * @returns Object with handlers to register on socket and cleanup function
 *
 * @example
 * // In your component:
 * const fireRoundIntervalRef = useRef<NodeJS.Timeout | null>(null);
 *
 * const handlers = createEarthquakeSocketHandlers({
 *   setEarthquakeState,
 *   setFireRoundActive,
 *   setFireRoundRemaining,
 *   setLetterGrid, // for player
 *   gameSessionIdRef,
 *   fireRoundIntervalRef, // CRITICAL: pass the ref!
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
    fireRoundIntervalRef,
    role,
  } = deps;

  // Use whichever grid setter is available
  const setGrid = setLetterGrid || setTableData;

  logger.log(`[${role}] Creating earthquake handlers`);

  /**
   * Clear any existing fire round countdown
   * Uses the ref to ensure we can clear the interval even if handler was recreated
   */
  const clearFireRoundInterval = () => {
    if (fireRoundIntervalRef.current) {
      logger.log(`[${role}] Clearing fire round interval`);
      clearInterval(fireRoundIntervalRef.current);
      fireRoundIntervalRef.current = null;
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
    logger.log(`[${role}] Fire round started, grid:`, data.grid);

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
    logger.log(`[${role}] Fire round: starting countdown from ${duration}s`);

    // Start countdown for fire round remaining time display
    let remaining = duration;
    const intervalId = setInterval(() => {
      remaining -= 1;
      logger.log(`[${role}] Fire round countdown: ${remaining}s remaining`);
      setFireRoundRemaining(remaining);
      if (remaining <= 0) {
        logger.log(`[${role}] Fire round: countdown complete, clearing interval`);
        clearFireRoundInterval();
      }
    }, 1000);

    // Store in ref - this persists across handler recreations
    fireRoundIntervalRef.current = intervalId;
    logger.log(`[${role}] Fire round: interval set`);
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
    logger.log(`[${role}] Cleanup called`);
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
