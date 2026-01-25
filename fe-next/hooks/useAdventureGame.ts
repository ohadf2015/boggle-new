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
  TileActivationEffect,
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
  /** Clear all activation effects from tiles */
  clearActivationEffects: () => void;
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
  | { type: 'CASCADE_COMPLETE' }
  | { type: 'CLEAR_ACTIVATION_EFFECTS' };

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
const TIME_TILE_BONUS_SECONDS = 5;
const RAINBOW_SCORE_MULTIPLIER = 1.25; // 25% bonus
const CHAIN_COMBO_MULTIPLIER = 1.5; // 50% extra combo bonus
const MAX_TIMER_SECONDS = 180; // Maximum timer cap

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
        // Initialize time tile bonus property
        ...(tileType === 'time' ? { bonusTime: TIME_TILE_BONUS_SECONDS } : {}),
        // Initialize chain tile property
        ...(tileType === 'chain' ? { isChained: false } : {}),
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
      // Structural sharing: only clone rows that will be modified
      // Collect all rows that need modification first
      const rowsToClone = new Set<number>();
      const gridSize = state.levelConfig.gridSize;

      // Track rows from path
      if (path) {
        for (const pos of path) {
          rowsToClone.add(pos.row);
          // Also track adjacent rows for ice melting and chain tile linking
          if (pos.row > 0) rowsToClone.add(pos.row - 1);
          if (pos.row < gridSize - 1) rowsToClone.add(pos.row + 1);
        }
        // Check for bomb tiles - they affect their entire row
        for (const pos of path) {
          if (state.tiles[pos.row]?.[pos.col]?.type === 'bomb') {
            rowsToClone.add(pos.row);
          }
        }
        // Check for chain tiles - they affect adjacent rows
        for (const pos of path) {
          if (state.tiles[pos.row]?.[pos.col]?.type === 'chain') {
            // Add all 3 rows (row above, current row, row below) for adjacent tile marking
            if (pos.row > 0) rowsToClone.add(pos.row - 1);
            rowsToClone.add(pos.row);
            if (pos.row < gridSize - 1) rowsToClone.add(pos.row + 1);
          }
        }
      }

      // Clone only affected rows (structural sharing optimization)
      const newTiles: TileState[][] = state.tiles.map((row, rowIndex) =>
        rowsToClone.has(rowIndex)
          ? row.map((tile) => ({ ...tile }))
          : row
      );

      let iceClearedCount = 0;
      let timeBonusSeconds = 0;
      const activationTimestamp = Date.now();

      // Clear any previous activation effects only on cloned rows
      for (const rowIndex of rowsToClone) {
        for (const tile of newTiles[rowIndex]) {
          tile.activationEffect = null;
          tile.activationTimestamp = undefined;
        }
      }

      if (path && path.length > 0) {
        // Check for gold tile multiplier (3x) and set activation effect
        const goldPositions = path.filter(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'gold'
        );
        if (goldPositions.length > 0) {
          finalScore *= GOLD_MULTIPLIER;
          // Set collect effect on gold tiles
          for (const pos of goldPositions) {
            const tile = newTiles[pos.row]?.[pos.col];
            if (tile) {
              tile.activationEffect = 'collect';
              tile.activationTimestamp = activationTimestamp;
            }
          }
        }

        // Check for rainbow/wildcard tile bonus (+25%) and set activation effect
        const rainbowPositions = path.filter(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'rainbow'
        );
        if (rainbowPositions.length > 0) {
          finalScore = Math.floor(finalScore * RAINBOW_SCORE_MULTIPLIER);
          // Set wildcard effect on rainbow tiles
          for (const pos of rainbowPositions) {
            const tile = newTiles[pos.row]?.[pos.col];
            if (tile) {
              tile.activationEffect = 'wildcard';
              tile.activationTimestamp = activationTimestamp;
            }
          }
        }

        // Check for chain tile combo bonus and set activation effect
        const chainPositions = path.filter(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'chain'
        );
        if (chainPositions.length > 0 && state.gameState.comboCount > 0) {
          // Apply enhanced combo bonus for chain tiles
          const comboBonus = state.gameState.comboCount * 0.1 * CHAIN_COMBO_MULTIPLIER;
          // Use Math.round to handle floating point precision issues
          // (e.g., 0.1 * 1.5 = 0.15000000000000002 causes 100 * 1.15 = 114.99999999999999)
          finalScore = Math.round(finalScore * (1 + comboBonus));
        }
        // Set link effect on chain tiles (even without combo bonus for visual feedback)
        for (const pos of chainPositions) {
          const tile = newTiles[pos.row]?.[pos.col];
          if (tile) {
            tile.activationEffect = 'link';
            tile.activationTimestamp = activationTimestamp;
          }
        }

        // Calculate time bonus from time tiles and set activation effect
        const timePositions = path.filter(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'time'
        );
        for (const pos of timePositions) {
          const tile = newTiles[pos.row]?.[pos.col];
          if (tile) {
            timeBonusSeconds += tile.bonusTime ?? TIME_TILE_BONUS_SECONDS;
            tile.activationEffect = 'timeBonus';
            tile.activationTimestamp = activationTimestamp;
          }
        }

        // Handle bomb tile - clear entire row (including ice tiles) and set explosion effect
        const bombPos = path.find(
          (pos) => newTiles[pos.row]?.[pos.col]?.type === 'bomb'
        );
        if (bombPos) {
          for (let col = 0; col < newTiles[bombPos.row].length; col++) {
            const tile = newTiles[bombPos.row][col];
            // Count ice tiles in the row before clearing
            if (tile.type === 'ice' && !tile.isCleared) {
              iceClearedCount++;
              tile.isFrozen = false; // Unfreeze ice tiles
              // Ice tiles get 'melt' effect (water animation)
              tile.activationEffect = 'melt';
            } else {
              // All other tiles in the row get 'explode' effect (shockwave animation)
              tile.activationEffect = 'explode';
            }
            tile.activationTimestamp = activationTimestamp;
            tile.isCleared = true;
          }
        }

        // Melt ice tiles adjacent to used tiles - convert to standard usable tiles
        for (const pos of path) {
          // Check all 8 neighbors
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = pos.row + dr;
              const nc = pos.col + dc;
              if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
                const neighborTile = newTiles[nr][nc];
                if (neighborTile.type === 'ice' && neighborTile.isFrozen) {
                  // Set melt effect before converting to standard
                  neighborTile.activationEffect = 'melt';
                  neighborTile.activationTimestamp = activationTimestamp;
                  // Convert ice to standard tile (melted ice becomes usable)
                  neighborTile.type = 'standard';
                  neighborTile.isFrozen = false;
                  // Note: isCleared stays false so tile can be selected
                  iceClearedCount++;
                }
              }
            }
          }
        }

        // Mark adjacent tiles as chained when chain tile is used
        if (chainPositions.length > 0) {
          for (const pos of chainPositions) {
            // Mark all 8 neighbors as chained
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = pos.row + dr;
                const nc = pos.col + dc;
                if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
                  newTiles[nr][nc].isChained = true;
                }
              }
            }
          }
        }

        // NOTE: Standard tiles should NOT be marked as cleared after word submission.
        // Only special tiles (ice - when cleared by adjacent tiles, bomb row tiles)
        // should be marked as cleared. This allows tiles to be reused across words.
        // The ice and bomb clearing logic above already handles those cases.
      }

      // Apply time bonus (capped at level's original timer duration)
      const newTimeRemaining = Math.min(
        state.timeRemaining + timeBonusSeconds,
        state.levelConfig.timerSeconds
      );

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
            const isComplete = newTimeRemaining >= obj.target;
            return {
              ...obj,
              current: newTimeRemaining,
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
          timeRemaining: newTimeRemaining,
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
        timeRemaining: newTimeRemaining,
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

    case 'CLEAR_ACTIVATION_EFFECTS': {
      // Clear all activation effects from tiles
      const clearedTiles = state.tiles.map((row) =>
        row.map((tile) => ({
          ...tile,
          activationEffect: null as TileActivationEffect,
          activationTimestamp: undefined,
        }))
      );
      return {
        ...state,
        tiles: clearedTiles,
      };
    }

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

  const clearActivationEffects = useCallback(() => {
    dispatch({ type: 'CLEAR_ACTIVATION_EFFECTS' });
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
    clearActivationEffects,
  };
}
