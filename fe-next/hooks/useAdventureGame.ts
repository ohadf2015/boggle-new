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
import { gameReducer, createInitialState } from './adventureGameReducer';


// ==============================================
// TYPES
// ==============================================

interface UseAdventureGameProps {
  levelConfig: LevelConfig;
  initialGrid: string[][];
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
  resetGame: () => void;
  isWildcard: (row: number, col: number) => boolean;
  markCascadeComplete: () => void;
  clearActivationEffects: () => void;
  isCascading: boolean;
  cascadePhase: CascadePhase;
  addTime: (seconds: number) => void;
  regenerateGrid: (grid: string[][]) => void;
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
}: UseAdventureGameProps): UseAdventureGameReturn {
  if (levelConfig.world < 1 || levelConfig.world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${levelConfig.world}`);
  }
  if (levelConfig.level < 1 || levelConfig.level > LEVELS_PER_WORLD) {
    throw new Error(`Invalid level: ${levelConfig.level}`);
  }

  const initialState = useMemo(
    () => createInitialState(levelConfig, initialGrid),
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

  const submitWord = useCallback((word: string, score: number) => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    dispatch({ type: 'SUBMIT_WORD', payload: { word, score } });

    comboTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'COMBO_TIMEOUT' });
    }, COMBO_TIMEOUT_MS);
  }, []);

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
      }, COMBO_TIMEOUT_MS);
    },
    [cascade]
  );

  const completeLevel = useCallback(() => {
    dispatch({ type: 'COMPLETE_LEVEL' });
  }, []);

  const resetGame = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    dispatch({
      type: 'RESET_GAME',
      payload: { initialState: createInitialState(levelConfig, initialGrid) },
    });
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
  };
}
