import { useState, useCallback, useRef, useEffect } from 'react';
import type { BlastTileState } from '../types';

// ==================== Constants ====================

export const HOT_TILE_MULTIPLIER = 3;
export const HOT_TILE_ACTIVATION_THRESHOLD = 0.75;
export const HOT_TILE_REFRESH_MS = 8000;
export const HOT_TILE_COUNT = 2;
export const HOT_TILE_DURATION_MS = 8000;

// ==================== Types ====================

export interface HotTile {
  row: number;
  col: number;
  /** Multiplier applied when this tile is used in a word */
  multiplier: number;
  /** Timestamp when this hot tile was created */
  createdAt: number;
  /** Timestamp when this hot tile expires */
  expiresAt: number;
}

export interface UseBlastHotTilesOptions {
  gridSize: number;
  /** Total round duration in ms */
  roundDuration: number;
  /** Current tile states for checking cleared/special */
  tileStates: BlastTileState[][];
  /** What percentage of the round triggers hot tiles (0.75 = last 25%) */
  activationThreshold?: number;
  /** How often hot tiles refresh in ms */
  refreshInterval?: number;
  /** How many hot tiles to show at once */
  count?: number;
  /** Whether hot tiles are enabled */
  enabled?: boolean;
}

export interface UseBlastHotTilesReturn {
  hotTiles: HotTile[];
  /** Whether the hot tiles phase is active */
  isHotPhase: boolean;
  /** Check if a specific tile position is hot */
  isHotTile: (row: number, col: number) => boolean;
  /** Get the multiplier for a hot tile (1 if not hot) */
  getHotMultiplier: (row: number, col: number) => number;
  /** Call when the round timer updates */
  onTimerUpdate: (elapsedMs: number) => void;
  /** Call when a hot tile is used in a word (removes it from active) */
  onHotTileUsed: (row: number, col: number) => void;
}

// ==================== Helpers ====================

/** Pick random eligible positions for hot tiles */
function pickHotPositions(
  tileStates: BlastTileState[][],
  count: number,
): Array<{ row: number; col: number }> {
  const eligible: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < tileStates.length; r++) {
    for (let c = 0; c < (tileStates[r]?.length ?? 0); c++) {
      const tile = tileStates[r][c];
      if (!tile.isCleared && tile.type === 'standard') {
        eligible.push({ row: r, col: c });
      }
    }
  }
  // Fisher-Yates shuffle then take first `count`
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, count);
}

// ==================== Hook ====================

export function useBlastHotTiles(options: UseBlastHotTilesOptions): UseBlastHotTilesReturn {
  const {
    roundDuration,
    tileStates,
    activationThreshold = HOT_TILE_ACTIVATION_THRESHOLD,
    refreshInterval = HOT_TILE_REFRESH_MS,
    count = HOT_TILE_COUNT,
    enabled = true,
  } = options;

  const [hotTiles, setHotTiles] = useState<HotTile[]>([]);
  const [isHotPhase, setIsHotPhase] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tileStatesRef = useRef(tileStates);
  tileStatesRef.current = tileStates;

  const generateHotTiles = useCallback(() => {
    const now = Date.now();
    const positions = pickHotPositions(tileStatesRef.current, count);
    const newTiles: HotTile[] = positions.map(pos => ({
      ...pos,
      multiplier: HOT_TILE_MULTIPLIER,
      createdAt: now,
      expiresAt: now + HOT_TILE_DURATION_MS,
    }));
    setHotTiles(newTiles);
  }, [count]);

  const startRefreshCycle = useCallback(() => {
    // Clear existing
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    // Generate initial batch
    generateHotTiles();
    // Set up periodic refresh
    refreshTimerRef.current = setInterval(() => {
      generateHotTiles();
    }, refreshInterval);
  }, [generateHotTiles, refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const onTimerUpdate = useCallback(
    (elapsedMs: number) => {
      if (!enabled) return;

      const ratio = elapsedMs / roundDuration;
      const shouldBeHot = ratio >= activationThreshold;

      if (shouldBeHot && !isHotPhase) {
        setIsHotPhase(true);
        startRefreshCycle();
      } else if (!shouldBeHot && isHotPhase) {
        setIsHotPhase(false);
        setHotTiles([]);
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      }
    },
    [enabled, roundDuration, activationThreshold, isHotPhase, startRefreshCycle],
  );

  const onHotTileUsed = useCallback((row: number, col: number) => {
    setHotTiles(prev => prev.filter(t => t.row !== row || t.col !== col));
  }, []);

  const isHotTile = useCallback(
    (row: number, col: number) => hotTiles.some(t => t.row === row && t.col === col),
    [hotTiles],
  );

  const getHotMultiplier = useCallback(
    (row: number, col: number) => {
      const tile = hotTiles.find(t => t.row === row && t.col === col);
      return tile ? tile.multiplier : 1;
    },
    [hotTiles],
  );

  return {
    hotTiles: enabled ? hotTiles : [],
    isHotPhase: enabled ? isHotPhase : false,
    isHotTile,
    getHotMultiplier,
    onTimerUpdate,
    onHotTileUsed,
  };
}
