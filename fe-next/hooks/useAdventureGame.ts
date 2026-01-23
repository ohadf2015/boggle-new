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
  TileType,
} from '@/types/adventure';
import { WORLDS_COUNT, LEVELS_PER_WORLD } from '@/lib/adventure';

// ==============================================
// TYPES
// ==============================================

interface UseAdventureGameProps {
  /** Level configuration */
  levelConfig: LevelConfig;
  /** Initial letter grid */
  initialGrid: string[][];
}

interface UseAdventureGameReturn {
  /** Current game state */
  gameState: AdventureGameState;
  /** 2D array of tile states */
  tiles: TileState[][];
  /** Current objective progress */
  objectives: LevelObjective[];
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether the level can be completed (primary objective met) */
  canComplete: boolean;
  /** Whether the game is currently running */
  isPlaying: boolean;
  /** Whether cascade animation has completed */
  cascadeComplete: boolean;
  /** Submit a word and score */
  submitWord: (word: string, score: number) => void;
  /** Submit a word with path for special tile effects */
  submitWordWithPath: (
    word: string,
    score: number,
    path: Array<{ row: number; col: number }>
  ) => void;
  /** Start the game timer */
  startGame: () => void;
  /** Pause the game timer */
  pauseGame: () => void;
  /** Complete the level and calculate stars */
  completeLevel: () => void;
  /** Reset the game to initial state */
  resetGame: () => void;
  /** Check if a tile is a wildcard (rainbow) */
  isWildcard: (row: number, col: number) => boolean;
  /** Mark cascade animation as complete */
  markCascadeComplete: () => void;
}

// ==============================================
// ACTION TYPES
// ==============================================

type GameAction =
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'TICK' }
  | {
      type: 'SUBMIT_WORD';
      payload: {
        word: string;
        score: number;
        path?: Array<{ row: number; col: number }>;
      };
    }
  | { type: 'COMPLETE_LEVEL' }
  | { type: 'RESET_GAME'; payload: { initialState: GameState } }
  | { type: 'COMBO_TIMEOUT' }
  | { type: 'CASCADE_COMPLETE' };

interface GameState {
  gameState: AdventureGameState;
  tiles: TileState[][];
  objectives: LevelObjective[];
  timeRemaining: number;
  isPlaying: boolean;
  levelConfig: LevelConfig;
  cascadeComplete: boolean;
}

// ==============================================
// CONSTANTS
// ==============================================

const COMBO_TIMEOUT_MS = 3000; // 3 seconds
const GOLD_MULTIPLIER = 3;
const LONG_WORD_LENGTH = 5;

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Initialize tile states from level config
 */
function initializeTiles(
  grid: string[][],
  levelConfig: LevelConfig
): TileState[][] {
  const tiles: TileState[][] = [];
  const specialTileMap = new Map<string, TileType>();

  // Build map of special tiles for O(1) lookup
  for (const tile of levelConfig.specialTiles) {
    specialTileMap.set(`${tile.row},${tile.col}`, tile.type);
  }

  // Create tile states
  for (let row = 0; row < grid.length; row++) {
    const rowTiles: TileState[] = [];
    for (let col = 0; col < grid[row].length; col++) {
      const specialType = specialTileMap.get(`${row},${col}`);
      const tileType: TileType = specialType || 'standard';

      rowTiles.push({
        letter: grid[row][col],
        type: tileType,
        isCleared: false,
        isFrozen: tileType === 'ice',
      });
    }
    tiles.push(rowTiles);
  }

  return tiles;
}

/**
 * Initialize objectives from level config
 */
function initializeObjectives(levelConfig: LevelConfig): LevelObjective[] {
  return levelConfig.objectives.map((obj) => ({
    ...obj,
    current: 0,
    isComplete: false,
  }));
}

/**
 * Create initial game state
 */
function createInitialState(
  levelConfig: LevelConfig,
  grid: string[][]
): GameState {
  return {
    gameState: {
      levelConfig,
      tiles: [], // Will be set from tiles array
      score: 0,
      wordsFound: [],
      objectives: [], // Will be set from objectives array
      comboCount: 0,
      cascadeActive: false,
      isComplete: false,
      stars: 0,
    },
    tiles: initializeTiles(grid, levelConfig),
    objectives: initializeObjectives(levelConfig),
    timeRemaining: levelConfig.timerSeconds,
    isPlaying: false,
    levelConfig,
    cascadeComplete: false,
  };
}

/**
 * Calculate stars based on objectives completion
 * - 1 star: Primary objective met
 * - 2 stars: Primary + some secondary
 * - 3 stars: All objectives met
 */
function calculateStars(objectives: LevelObjective[]): 0 | 1 | 2 | 3 {
  const primaryObjectives = objectives.filter((o) => o.isPrimary);
  const secondaryObjectives = objectives.filter((o) => !o.isPrimary);

  // Check if primary objectives are met
  const primaryMet = primaryObjectives.every(
    (o) => (o.current ?? 0) >= o.target
  );
  if (!primaryMet) return 0;

  // Check secondary objectives
  const secondaryCompleted = secondaryObjectives.filter(
    (o) => (o.current ?? 0) >= o.target
  ).length;

  if (secondaryCompleted === secondaryObjectives.length) {
    return 3; // All objectives met
  } else if (secondaryCompleted > 0) {
    return 2; // Some secondary met
  }

  return 1; // Only primary met
}

/**
 * Check if position is adjacent to another
 */
function isAdjacent(
  pos1: { row: number; col: number },
  pos2: { row: number; col: number }
): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

// ==============================================
// REDUCER
// ==============================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, isPlaying: true };

    case 'PAUSE_GAME':
      return { ...state, isPlaying: false };

    case 'TICK': {
      if (!state.isPlaying) return state;

      const newTime = Math.max(0, state.timeRemaining - 1);
      const isTimeUp = newTime === 0;

      if (isTimeUp) {
        return {
          ...state,
          timeRemaining: 0,
          isPlaying: false,
          gameState: {
            ...state.gameState,
            isComplete: true,
            stars: calculateStars(state.objectives),
          },
        };
      }

      return { ...state, timeRemaining: newTime };
    }

    case 'SUBMIT_WORD': {
      const { word, score, path } = action.payload;

      // Check for duplicate
      if (state.gameState.wordsFound.includes(word)) {
        return state;
      }

      // Calculate score with special tile effects
      let finalScore = score;
      let newTiles = state.tiles.map((row) => row.map((tile) => ({ ...tile })));
      let iceClearedCount = 0;

      if (path && path.length > 0) {
        // Check for gold tile multiplier
        const hasGold = path.some(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'gold'
        );
        if (hasGold) {
          finalScore *= GOLD_MULTIPLIER;
        }

        // Handle bomb tile - clear entire row
        const bombPos = path.find(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'bomb'
        );
        if (bombPos) {
          for (let col = 0; col < newTiles[bombPos.row].length; col++) {
            newTiles[bombPos.row][col].isCleared = true;
          }
        }

        // Clear ice tiles adjacent to used tiles
        const gridSize = state.levelConfig.gridSize;
        for (const pos of path) {
          // Check all 8 neighbors
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = pos.row + dr;
              const nc = pos.col + dc;
              if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
                const neighborTile = newTiles[nr][nc];
                if (neighborTile.type === 'ice' && !neighborTile.isCleared) {
                  neighborTile.isCleared = true;
                  iceClearedCount++;
                }
              }
            }
          }
        }

        // Mark path tiles as cleared (for used tiles in word)
        for (const pos of path) {
          newTiles[pos.row][pos.col].isCleared = true;
        }
      }

      // Update objectives
      const newObjectives = state.objectives.map((obj) => {
        let newCurrent = obj.current ?? 0;

        switch (obj.type) {
          case 'wordCount':
            newCurrent += 1;
            break;
          case 'scoreTarget':
            newCurrent = state.gameState.score + finalScore;
            break;
          case 'longWords':
            if (word.length >= LONG_WORD_LENGTH) {
              newCurrent += 1;
            }
            break;
          case 'clearIce':
            newCurrent += iceClearedCount;
            break;
          default:
            break;
        }

        return {
          ...obj,
          current: newCurrent,
          isComplete: newCurrent >= obj.target,
        };
      });

      // Increment combo
      const newComboCount = state.gameState.comboCount + 1;

      // Check if all primary objectives are now met (auto-complete)
      const primaryObjectives = newObjectives.filter((o) => o.isPrimary);
      const allPrimaryMet = primaryObjectives.every(
        (o) => (o.current ?? 0) >= o.target
      );

      // If all primary objectives are met, auto-complete the level
      if (allPrimaryMet) {
        // Update time bonus objective with current time remaining
        const finalObjectives = newObjectives.map((obj) => {
          if (obj.type === 'timeBonus') {
            const isComplete = state.timeRemaining >= obj.target;
            return {
              ...obj,
              current: state.timeRemaining,
              isComplete,
            };
          }
          return obj;
        });

        const stars = calculateStars(finalObjectives);

        return {
          ...state,
          tiles: newTiles,
          objectives: finalObjectives,
          isPlaying: false,
          gameState: {
            ...state.gameState,
            score: state.gameState.score + finalScore,
            wordsFound: [...state.gameState.wordsFound, word],
            comboCount: newComboCount,
            isComplete: true,
            stars,
          },
        };
      }

      // Primary objectives not yet met - continue playing
      return {
        ...state,
        tiles: newTiles,
        objectives: newObjectives,
        gameState: {
          ...state.gameState,
          score: state.gameState.score + finalScore,
          wordsFound: [...state.gameState.wordsFound, word],
          comboCount: newComboCount,
        },
      };
    }

    case 'COMBO_TIMEOUT':
      return {
        ...state,
        gameState: {
          ...state.gameState,
          comboCount: 0,
        },
      };

    case 'CASCADE_COMPLETE':
      return {
        ...state,
        cascadeComplete: true,
      };

    case 'COMPLETE_LEVEL': {
      // Update time bonus objective if applicable
      const updatedObjectives = state.objectives.map((obj) => {
        if (obj.type === 'timeBonus') {
          const isComplete = state.timeRemaining >= obj.target;
          return {
            ...obj,
            current: state.timeRemaining,
            isComplete,
          };
        }
        return obj;
      });

      const stars = calculateStars(updatedObjectives);

      return {
        ...state,
        isPlaying: false,
        objectives: updatedObjectives,
        gameState: {
          ...state.gameState,
          isComplete: true,
          stars,
        },
      };
    }

    case 'RESET_GAME':
      return action.payload.initialState;

    default:
      return state;
  }
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureGame({
  levelConfig,
  initialGrid,
}: UseAdventureGameProps): UseAdventureGameReturn {
  // Validate level config
  if (levelConfig.world < 1 || levelConfig.world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${levelConfig.world}`);
  }
  if (levelConfig.level < 1 || levelConfig.level > LEVELS_PER_WORLD) {
    throw new Error(`Invalid level: ${levelConfig.level}`);
  }

  // Create initial state
  const initialState = useMemo(
    () => createInitialState(levelConfig, initialGrid),
    [levelConfig, initialGrid]
  );

  // Game state reducer
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Combo timeout ref
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer effect - only depends on isPlaying
  // NOTE: timeRemaining is intentionally excluded from dependencies
  // The TICK action in the reducer handles stopping when time reaches 0
  // Including timeRemaining would cause effect to re-run every second, recreating the interval
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

  // Check if level can be completed
  const canComplete = useMemo(() => {
    const primaryObjectives = state.objectives.filter((o) => o.isPrimary);
    return primaryObjectives.every((o) => (o.current ?? 0) >= o.target);
  }, [state.objectives]);

  // Callbacks
  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const submitWord = useCallback((word: string, score: number) => {
    // Clear existing combo timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    dispatch({ type: 'SUBMIT_WORD', payload: { word, score } });

    // Set new combo timeout
    comboTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'COMBO_TIMEOUT' });
    }, COMBO_TIMEOUT_MS);
  }, []);

  const submitWordWithPath = useCallback(
    (word: string, score: number, path: Array<{ row: number; col: number }>) => {
      // Clear existing combo timeout
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      dispatch({ type: 'SUBMIT_WORD', payload: { word, score, path } });

      // Set new combo timeout
      comboTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'COMBO_TIMEOUT' });
      }, COMBO_TIMEOUT_MS);
    },
    []
  );

  const completeLevel = useCallback(() => {
    dispatch({ type: 'COMPLETE_LEVEL' });
  }, []);

  const resetGame = useCallback(() => {
    // Clear combo timeout
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

  return {
    gameState: state.gameState,
    tiles: state.tiles,
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
  };
}
