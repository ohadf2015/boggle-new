/**
 * useAdventureGame Hook
 *
 * Manages adventure game state including tiles, objectives, timer, and score.
 * Handles special tile effects and level completion logic.
 */

import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  LevelConfig,
  TileState,
  LevelObjective,
  AdventureGameState,
} from '@/types/adventure';
import { WORLDS_COUNT, LEVELS_PER_WORLD } from '@/lib/adventure';
import { useCascadeLoop, type CascadePhase } from './useCascadeLoop';
import { gameReducer, createInitialState, type ReducerUpgradeConfig } from './adventureGameReducer';


// ==============================================
// TYPES
// ==============================================

interface UseAdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
  /** Multiplier for combo decay timeout, e.g. 0.7 = 30% slower decay (longer timeout). From Cargo Bay upgrade. */
  comboDecayMultiplier?: number;
  /** Upgrade config for tile effect processing in the reducer */
  upgradeConfig?: ReducerUpgradeConfig;
}

interface UseAdventureGameReturn {
  gameState: AdventureGameState;
  tiles: TileState[][];
  tilesVersion: number;
  objectives: LevelObjective[];
  timeRemaining: number;
  canComplete: boolean;
  isPlaying: boolean;
  cascadeComplete: boolean;
  submitWord: (word: string, score: number) => void;
  submitWordWithPath: (
    word: string,
    score: number,
    path: Array<{ row: number; col: number }>
  ) => void;
  startGame: () => void;
  pauseGame: () => void;
  completeLevel: () => void;
  resetGame: (options?: { retainedScore?: number }) => void;
  isWildcard: (row: number, col: number) => boolean;
  markCascadeComplete: () => void;
  clearActivationEffects: () => void;
  isCascading: boolean;
  cascadePhase: CascadePhase;
  addTime: (seconds: number) => void;
  regenerateGrid: (grid: string[][]) => void;
  /** Activate time freeze (Time Freeze upgrade) */
  activateFreeze: (seconds: number) => void;
  /** Whether time is currently frozen */
  isFrozen: boolean;
  /** Seconds remaining in freeze */
  freezeRemaining: number;
  /** Whether freeze has been used this level */
  freezeUsed: boolean;
  /** Use a shuffle action (Word Dynamite upgrade) */
  useShuffle: () => void;
  /** Shuffles remaining this level */
  shufflesRemaining: number;
}

// ==============================================
// CONSTANTS
// ==============================================

const COMBO_TIMEOUT_MS = 3000;

// ==============================================
// HOOK
// ==============================================

export function useAdventureGame({
  levelConfig,
  initialGrid,
  comboDecayMultiplier = 1,
  upgradeConfig,
}: UseAdventureGameProps): UseAdventureGameReturn {
  if (levelConfig.world < 1 || levelConfig.world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${levelConfig.world}`);
  }
  if (levelConfig.level < 1 || levelConfig.level > LEVELS_PER_WORLD) {
    throw new Error(`Invalid level: ${levelConfig.level}`);
  }

  const initialState = useMemo(
    () => createInitialState(levelConfig, initialGrid, upgradeConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelConfig, initialGrid]
  );

  const [state, dispatch] = useReducer(gameReducer, initialState);

  const cascade = useCascadeLoop({
    onPhaseChange: (_phase: CascadePhase) => {},
  });

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer effect - only depends on isPlaying
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (state.isPlaying) {
      intervalId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isPlaying]);

  // Cleanup combo timeout on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  const canComplete = useMemo(() => {
    const primaryObjectives = state.objectives.filter((o) => o.isPrimary);
    return primaryObjectives.every((o) => (o.current ?? 0) >= o.target);
  }, [state.objectives]);

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  // comboDecayMultiplier < 1 means slower decay (longer timeout)
  const effectiveComboTimeout = Math.floor(COMBO_TIMEOUT_MS / comboDecayMultiplier);

  const submitWord = useCallback((word: string, score: number) => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    dispatch({ type: 'SUBMIT_WORD', payload: { word, score } });

    comboTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'COMBO_TIMEOUT' });
    }, effectiveComboTimeout);
  }, [effectiveComboTimeout]);

  const submitWordWithPath = useCallback(
    (word: string, score: number, path: Array<{ row: number; col: number }>) => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      dispatch({ type: 'SUBMIT_WORD', payload: { word, score, path } });

      const removedIndices = path.map((pos) => `tile-${pos.row}-${pos.col}`);
      cascade.startCascade(removedIndices);

      comboTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'COMBO_TIMEOUT' });
      }, effectiveComboTimeout);
    },
    [cascade, effectiveComboTimeout]
  );

  const completeLevel = useCallback(() => {
    dispatch({ type: 'COMPLETE_LEVEL' });
  }, []);

  const resetGame = useCallback((options?: { retainedScore?: number }) => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    const fresh = createInitialState(levelConfig, initialGrid, upgradeConfig);
    if (options?.retainedScore && options.retainedScore > 0) {
      fresh.gameState = { ...fresh.gameState, score: options.retainedScore };
    }
    dispatch({ type: 'RESET_GAME', payload: { initialState: fresh } });
  }, [levelConfig, initialGrid]);

  const isWildcard = useCallback(
    (row: number, col: number): boolean => {
      return state.tiles[row]?.[col]?.type === 'rainbow';
    },
    [state.tiles]
  );

  const markCascadeComplete = useCallback(() => {
    dispatch({ type: 'CASCADE_COMPLETE' });
  }, []);

  const clearActivationEffects = useCallback(() => {
    dispatch({ type: 'CLEAR_ACTIVATION_EFFECTS' });
  }, []);

  const addTime = useCallback((seconds: number) => {
    dispatch({ type: 'ADD_TIME', payload: { seconds } });
  }, []);

  const regenerateGrid = useCallback((grid: string[][]) => {
    dispatch({ type: 'REGENERATE_GRID', payload: { grid } });
  }, []);

  const activateFreeze = useCallback((seconds: number) => {
    dispatch({ type: 'ACTIVATE_TIME_FREEZE', payload: { seconds } });
  }, []);

  const useShuffle = useCallback(() => {
    if (state.shufflesRemaining <= 0) return;
    dispatch({ type: 'USE_SHUFFLE' });
    // Regenerate the grid with fresh letters (keeping special tile positions)
    const newGrid = levelConfig.gridSize;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const freshGrid: string[][] = [];
    for (let r = 0; r < newGrid; r++) {
      const row: string[] = [];
      for (let c = 0; c < newGrid; c++) {
        row.push(letters[Math.floor(Math.random() * letters.length)]);
      }
      freshGrid.push(row);
    }
    dispatch({ type: 'REGENERATE_GRID', payload: { grid: freshGrid } });
  }, [state.shufflesRemaining, levelConfig.gridSize]);

  return {
    gameState: state.gameState,
    tiles: state.tiles,
    tilesVersion: state.tilesVersion,
    objectives: state.objectives,
    timeRemaining: state.timeRemaining,
    canComplete,
    isPlaying: state.isPlaying,
    cascadeComplete: state.cascadeComplete,
    submitWord,
    submitWordWithPath,
    startGame,
    pauseGame,
    completeLevel,
    resetGame,
    isWildcard,
    markCascadeComplete,
    clearActivationEffects,
    isCascading: cascade.state.isProcessing,
    cascadePhase: cascade.state.phase,
    addTime,
    regenerateGrid,
    activateFreeze,
    isFrozen: state.freezeRemaining > 0,
    freezeRemaining: state.freezeRemaining,
    freezeUsed: state.freezeUsed,
    useShuffle,
    shufflesRemaining: state.shufflesRemaining,
  };
}
