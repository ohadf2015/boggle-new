/** Pure reducer and helpers for adventure game state management. */

import type {
  LevelConfig,
  TileState,
  LevelObjective,
  AdventureGameState,
  TileType,
  TileActivationEffect,
} from '@/types/adventure';

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'TICK' }
  /** Fired by the external timer store when time reaches 0. Sets isComplete directly. */
  | { type: 'TIMER_EXPIRED' }
  /** Sync reducer's timeRemaining from the external timer store snapshot. */
  | { type: 'TIME_SYNC'; payload: { timeRemaining: number } }
  | { type: 'ADD_TIME'; payload: { seconds: number } }
  | {
      type: 'SUBMIT_WORD';
      payload: {
        word: string;
        score: number;
        path?: Array<{ row: number; col: number }>;
        /** Word Dynamite T3: clear adjacent tiles around the word path */
        detonate?: boolean;
      };
    }
  | { type: 'COMPLETE_LEVEL' }
  | { type: 'RESET_GAME'; payload: { initialState: GameState } }
  | { type: 'COMBO_TIMEOUT' }
  | { type: 'CASCADE_COMPLETE' }
  | { type: 'CLEAR_ACTIVATION_EFFECTS' }
  | { type: 'REGENERATE_GRID'; payload: { grid: string[][] } }
  | { type: 'ACTIVATE_TIME_FREEZE'; payload: { seconds: number } }
  | { type: 'USE_SHUFFLE' }
  | { type: 'UPDATE_OBJECTIVE'; payload: { objectiveType: string; value: number; mode: 'set' | 'increment' } };

/** Lightweight upgrade config stored in reducer state for tile effect processing */
export interface ReducerUpgradeConfig {
  /** Blast Shield T2: bomb tiles give time instead of removing it */
  bombTimerInvert?: boolean;
  /** Gem Detector: boost to special tile spawn rate (0-1) */
  specialTileBoost?: number;
  /** Gem Detector T3: guarantee a gold tile on cascade refill */
  guaranteedGoldTile?: boolean;
  /** Word Dynamite: shuffle uses per level */
  shuffleUses?: number;
  /** Blast Shield T1: ice tiles take fewer hits to melt */
  iceTileReduction?: boolean;
}

export interface GameState {
  gameState: AdventureGameState;
  tiles: TileState[][];
  /** Version counter for tiles - incremented on every tile mutation for O(1) change detection */
  tilesVersion: number;
  objectives: LevelObjective[];
  timeRemaining: number;
  isPlaying: boolean;
  levelConfig: LevelConfig;
  cascadeComplete: boolean;
  /** Upgrade config for tile effect processing (optional, defaults to empty) */
  upgradeConfig?: ReducerUpgradeConfig;
  /** Time freeze: seconds remaining (0 = not frozen) */
  freezeRemaining: number;
  /** Whether time freeze has been used this level */
  freezeUsed: boolean;
  /** Shuffle uses remaining this level */
  shufflesRemaining: number;
}

const GOLD_MULTIPLIER = 3;
const LONG_WORD_LENGTH = 5;
const TIME_TILE_BONUS_SECONDS = 5;
const RAINBOW_SCORE_MULTIPLIER = 1.25;
const CHAIN_COMBO_MULTIPLIER = 1.5;
const MAX_TIMER_SECONDS = 180;

function initializeTiles(
  grid: string[][],
  levelConfig: LevelConfig
): TileState[][] {
  const tiles: TileState[][] = [];
  const specialTileMap = new Map<string, TileType>();

  for (const tile of levelConfig.specialTiles) {
    specialTileMap.set(`${tile.row},${tile.col}`, tile.type);
  }

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
        ...(tileType === 'time' ? { bonusTime: TIME_TILE_BONUS_SECONDS } : {}),
        ...(tileType === 'chain' ? { isChained: false } : {}),
      });
    }
    tiles.push(rowTiles);
  }

  return tiles;
}

function initializeObjectives(levelConfig: LevelConfig): LevelObjective[] {
  return levelConfig.objectives.map((obj) => ({
    ...obj,
    current: 0,
    isComplete: false,
  }));
}

export function createInitialState(
  levelConfig: LevelConfig,
  grid: string[][],
  upgradeConfig?: ReducerUpgradeConfig,
): GameState {
  return {
    gameState: {
      levelConfig,
      tiles: [],
      score: 0,
      wordsFound: [],
      objectives: [],
      comboCount: 0,
      cascadeActive: false,
      isComplete: false,
      stars: 0,
    },
    tiles: initializeTiles(grid, levelConfig),
    tilesVersion: 0,
    objectives: initializeObjectives(levelConfig),
    timeRemaining: levelConfig.isBossLevel ? 0 : levelConfig.timerSeconds,
    isPlaying: false,
    levelConfig,
    cascadeComplete: false,
    upgradeConfig,
    freezeRemaining: 0,
    freezeUsed: false,
    shufflesRemaining: upgradeConfig?.shuffleUses ?? 0,
  };
}

export function calculateStars(objectives: LevelObjective[]): 0 | 1 | 2 | 3 {
  if (objectives.length === 0) return 0;

  // Primary objectives must ALL be complete to earn any stars.
  // Without this gate, 3 completed secondary objectives on a failed
  // level would award 3 stars (timer-expired but secondaries met).
  const primaryObjectives = objectives.filter((o) => o.isPrimary);
  // If no primaries exist (shouldn't happen in practice), require at least one completed objective
  if (primaryObjectives.length === 0) {
    const completedCount = objectives.filter((o) => (o.current ?? 0) >= o.target).length;
    return Math.min(completedCount, 3) as 0 | 1 | 2 | 3;
  }
  const allPrimaryMet = primaryObjectives.every(
    (o) => (o.current ?? 0) >= o.target
  );
  if (!allPrimaryMet) return 0;

  // 1 star for completing all primaries, +1 per completed secondary (capped at 3).
  const secondaryCompleted = objectives.filter(
    (o) => !o.isPrimary && (o.current ?? 0) >= o.target
  ).length;

  return Math.min(1 + secondaryCompleted, 3) as 0 | 1 | 2 | 3;
}

/**
 * Process special tile effects when a word is submitted with a path.
 * Mutates newTiles in place and returns computed bonuses.
 */
function processSpecialTileEffects(
  path: Array<{ row: number; col: number }>,
  newTiles: TileState[][],
  gridSize: number,
  comboCount: number,
  baseScore: number,
  upgradeConfig?: ReducerUpgradeConfig,
): { finalScore: number; iceClearedCount: number; timeBonusSeconds: number } {
  let finalScore = baseScore;
  let iceClearedCount = 0;
  let timeBonusSeconds = 0;
  const activationTimestamp = Date.now();

  // Multiplier tiles (2x each, stackable)
  const multiplierPositions = path.filter(
    (pos) => newTiles[pos.row]?.[pos.col]?.type === 'multiplier'
  );
  for (const pos of multiplierPositions) {
    finalScore *= 2;
    const tile = newTiles[pos.row]?.[pos.col];
    if (tile) {
      tile.activationEffect = 'multiply';
      tile.activationTimestamp = activationTimestamp;
      tile.type = 'standard';
    }
  }

  // Gold tile multiplier (3x)
  const goldPositions = path.filter(
    (pos) => newTiles[pos.row]?.[pos.col]?.type === 'gold'
  );
  if (goldPositions.length > 0) {
    finalScore *= GOLD_MULTIPLIER;
    for (const pos of goldPositions) {
      const tile = newTiles[pos.row]?.[pos.col];
      if (tile) {
        tile.activationEffect = 'collect';
        tile.activationTimestamp = activationTimestamp;
      }
    }
  }

  // Rainbow/wildcard tile bonus (+25%)
  const rainbowPositions = path.filter(
    (pos) => newTiles[pos.row]?.[pos.col]?.type === 'rainbow'
  );
  if (rainbowPositions.length > 0) {
    finalScore = Math.floor(finalScore * RAINBOW_SCORE_MULTIPLIER);
    for (const pos of rainbowPositions) {
      const tile = newTiles[pos.row]?.[pos.col];
      if (tile) {
        tile.activationEffect = 'wildcard';
        tile.activationTimestamp = activationTimestamp;
      }
    }
  }

  // Chain tile combo bonus
  const chainPositions = path.filter(
    (pos) => newTiles[pos.row]?.[pos.col]?.type === 'chain'
  );
  if (chainPositions.length > 0 && comboCount > 0) {
    const comboBonus = comboCount * 0.1 * CHAIN_COMBO_MULTIPLIER;
    finalScore = Math.round(finalScore * (1 + comboBonus));
  }
  for (const pos of chainPositions) {
    const tile = newTiles[pos.row]?.[pos.col];
    if (tile) {
      tile.activationEffect = 'link';
      tile.activationTimestamp = activationTimestamp;
    }
  }

  // Time tiles
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

  // Bomb tile - clear entire row (Blast Shield T2: give time instead)
  const bombPos = path.find(
    (pos) => newTiles[pos.row]?.[pos.col]?.type === 'bomb'
  );
  if (bombPos) {
    if (upgradeConfig?.bombTimerInvert) {
      // Blast Shield T2: bomb gives +5s instead of clearing row
      timeBonusSeconds += TIME_TILE_BONUS_SECONDS;
      const tile = newTiles[bombPos.row][bombPos.col];
      if (tile) {
        tile.activationEffect = 'timeBonus';
        tile.activationTimestamp = activationTimestamp;
        tile.isCleared = true;
      }
    } else {
      for (let col = 0; col < newTiles[bombPos.row].length; col++) {
        const tile = newTiles[bombPos.row][col];
        if (tile.type === 'ice' && !tile.isCleared) {
          iceClearedCount++;
          tile.isFrozen = false;
          tile.activationEffect = 'melt';
        } else {
          tile.activationEffect = 'explode';
        }
        tile.activationTimestamp = activationTimestamp;
        tile.isCleared = true;
      }
    }
  }

  // Melt ice tiles adjacent to used tiles
  // Blast Shield T1 (iceTileReduction): extends melt range from 1 to 2 tiles
  const meltRange = upgradeConfig?.iceTileReduction ? 2 : 1;
  for (const pos of path) {
    for (let dr = -meltRange; dr <= meltRange; dr++) {
      for (let dc = -meltRange; dc <= meltRange; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          const neighborTile = newTiles[nr][nc];
          if (neighborTile.type === 'ice' && neighborTile.isFrozen) {
            neighborTile.activationEffect = 'melt';
            neighborTile.activationTimestamp = activationTimestamp;
            neighborTile.type = 'standard';
            neighborTile.isFrozen = false;
            iceClearedCount++;
          }
        }
      }
    }
  }

  // Unlock locked tiles when word contains same letter
  const wordLetters = new Set<string>();
  for (const pos of path) {
    const tile = newTiles[pos.row]?.[pos.col];
    if (tile) {
      wordLetters.add(tile.letter.toUpperCase());
    }
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const tile = newTiles[row][col];
      if (tile.type === 'locked') {
        if (wordLetters.has(tile.letter.toUpperCase())) {
          tile.activationEffect = 'unlock';
          tile.activationTimestamp = activationTimestamp;
          tile.type = 'standard';
        }
      }
    }
  }

  // Mark adjacent tiles as chained when chain tile is used
  if (chainPositions.length > 0) {
    for (const pos of chainPositions) {
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

  return { finalScore, iceClearedCount, timeBonusSeconds };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, isPlaying: true };

    case 'PAUSE_GAME':
      return { ...state, isPlaying: false };

    case 'TICK': {
      if (!state.isPlaying) return state;

      // Boss levels have no countdown — fight lasts until boss dies or player dies.
      // Timer counts UP (elapsed time) for display purposes only.
      if (state.levelConfig.isBossLevel) {
        return { ...state, timeRemaining: state.timeRemaining + 1 };
      }

      // Time Freeze: decrement freeze counter instead of game timer
      if (state.freezeRemaining > 0) {
        return { ...state, freezeRemaining: state.freezeRemaining - 1 };
      }

      const newTime = Math.max(0, state.timeRemaining - 1);
      if (newTime === 0) {
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

    case 'TIMER_EXPIRED': {
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

    case 'TIME_SYNC': {
      if (!state.isPlaying) return state;
      return { ...state, timeRemaining: action.payload.timeRemaining };
    }

    case 'ADD_TIME': {
      // Boss levels have no countdown — ignore time adjustments
      if (state.levelConfig.isBossLevel) return state;
      const newTime = Math.max(
        0,
        Math.min(
          state.timeRemaining + action.payload.seconds,
          MAX_TIMER_SECONDS
        )
      );
      return { ...state, timeRemaining: newTime };
    }

    case 'SUBMIT_WORD': {
      const { word, score, path, detonate } = action.payload;

      if (state.gameState.wordsFound.includes(word)) {
        return state;
      }

      // Collect rows that need cloning
      const rowsToClone = new Set<number>();
      const gridSize = state.levelConfig.gridSize;

      if (path) {
        for (const pos of path) {
          rowsToClone.add(pos.row);
          if (pos.row > 0) rowsToClone.add(pos.row - 1);
          if (pos.row < gridSize - 1) rowsToClone.add(pos.row + 1);
        }
        for (const pos of path) {
          if (state.tiles[pos.row]?.[pos.col]?.type === 'bomb') {
            rowsToClone.add(pos.row);
          }
        }
        for (const pos of path) {
          if (state.tiles[pos.row]?.[pos.col]?.type === 'chain') {
            if (pos.row > 0) rowsToClone.add(pos.row - 1);
            rowsToClone.add(pos.row);
            if (pos.row < gridSize - 1) rowsToClone.add(pos.row + 1);
          }
        }
      }

      // Clone only affected rows (structural sharing)
      const newTiles: TileState[][] = state.tiles.map((row, rowIndex) =>
        rowsToClone.has(rowIndex)
          ? row.map((tile) => ({ ...tile }))
          : row
      );

      // Clear previous activation effects on cloned rows
      for (const rowIndex of rowsToClone) {
        for (const tile of newTiles[rowIndex]) {
          tile.activationEffect = null;
          tile.activationTimestamp = undefined;
        }
      }

      // Process tile effects
      let finalScore = score;
      let iceClearedCount = 0;
      let timeBonusSeconds = 0;

      if (path && path.length > 0) {
        const effects = processSpecialTileEffects(
          path,
          newTiles,
          gridSize,
          state.gameState.comboCount,
          score,
          state.upgradeConfig,
        );
        finalScore = effects.finalScore;
        iceClearedCount = effects.iceClearedCount;
        timeBonusSeconds = effects.timeBonusSeconds;
      }

      // Word Dynamite T3: detonate clears all tiles adjacent to the word path
      if (detonate && path && path.length > 0) {
        const pathSet = new Set(path.map(p => `${p.row},${p.col}`));
        const detonatedPositions: Array<{ row: number; col: number }> = [];

        for (const pos of path) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = pos.row + dr;
              const nc = pos.col + dc;
              if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
              const key = `${nr},${nc}`;
              if (pathSet.has(key)) continue; // already part of word
              pathSet.add(key); // prevent duplicates
              const tile = newTiles[nr]?.[nc];
              if (tile && !tile.isCleared && !tile.isFrozen) {
                detonatedPositions.push({ row: nr, col: nc });
              }
            }
          }
        }

        // Clone additional rows and mark detonated tiles
        for (const pos of detonatedPositions) {
          if (!rowsToClone.has(pos.row)) {
            rowsToClone.add(pos.row);
            newTiles[pos.row] = newTiles[pos.row].map(t => ({ ...t }));
          }
          const tile = newTiles[pos.row][pos.col];
          tile.isCleared = true;
          tile.activationEffect = 'explode' as TileActivationEffect;
          tile.activationTimestamp = Date.now();
        }

        // Bonus score for detonated tiles (10 points each)
        finalScore += detonatedPositions.length * 10;
      }

      const newTimeRemaining = Math.min(
        state.timeRemaining + timeBonusSeconds,
        MAX_TIMER_SECONDS
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

      const newComboCount = state.gameState.comboCount + 1;

      // Check auto-complete
      const primaryObjectives = newObjectives.filter((o) => o.isPrimary);
      const allPrimaryMet = primaryObjectives.every(
        (o) => (o.current ?? 0) >= o.target
      );

      if (allPrimaryMet) {
        const finalObjectives = newObjectives.map((obj) => {
          if (obj.type === 'timeBonus') {
            const isComplete = newTimeRemaining >= obj.target;
            return { ...obj, current: newTimeRemaining, isComplete };
          }
          return obj;
        });

        return {
          ...state,
          tiles: newTiles,
          tilesVersion: state.tilesVersion + 1,
          objectives: finalObjectives,
          isPlaying: false,
          timeRemaining: newTimeRemaining,
          gameState: {
            ...state.gameState,
            score: state.gameState.score + finalScore,
            wordsFound: [...state.gameState.wordsFound, word],
            comboCount: newComboCount,
            isComplete: true,
            stars: calculateStars(finalObjectives),
          },
        };
      }

      return {
        ...state,
        tiles: newTiles,
        tilesVersion: state.tilesVersion + 1,
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
      if (state.gameState.isComplete) return state;
      return {
        ...state,
        gameState: { ...state.gameState, comboCount: 0 },
      };

    case 'CASCADE_COMPLETE':
      return { ...state, cascadeComplete: true };

    case 'CLEAR_ACTIVATION_EFFECTS': {
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
        tilesVersion: state.tilesVersion + 1,
      };
    }

    case 'REGENERATE_GRID': {
      const emptyConfig: LevelConfig = { ...state.levelConfig, specialTiles: [] };
      return {
        ...state,
        tiles: initializeTiles(action.payload.grid, emptyConfig),
        tilesVersion: state.tilesVersion + 1,
      };
    }

    case 'COMPLETE_LEVEL': {
      const updatedObjectives = state.objectives.map((obj) => {
        if (obj.type === 'timeBonus') {
          const isComplete = state.timeRemaining >= obj.target;
          return { ...obj, current: state.timeRemaining, isComplete };
        }
        return obj;
      });

      return {
        ...state,
        isPlaying: false,
        objectives: updatedObjectives,
        gameState: {
          ...state.gameState,
          isComplete: true,
          stars: calculateStars(updatedObjectives),
        },
      };
    }

    case 'RESET_GAME':
      return action.payload.initialState;

    case 'ACTIVATE_TIME_FREEZE': {
      if (state.freezeUsed || state.freezeRemaining > 0) return state;
      return {
        ...state,
        freezeRemaining: action.payload.seconds,
        freezeUsed: true,
      };
    }

    case 'USE_SHUFFLE': {
      if (state.shufflesRemaining <= 0) return state;
      // Shuffle regenerates the grid — the actual grid regen is handled
      // by the caller dispatching REGENERATE_GRID after USE_SHUFFLE
      return {
        ...state,
        shufflesRemaining: state.shufflesRemaining - 1,
      };
    }

    case 'UPDATE_OBJECTIVE': {
      const { objectiveType, value, mode } = action.payload;
      const hasType = state.objectives.some(o => o.type === objectiveType);
      if (!hasType) return state;

      // Check if update would actually change anything — bail early to prevent re-render loops
      const target = state.objectives.find(o => o.type === objectiveType);
      if (target) {
        const newCurrent = mode === 'set' ? value : (target.current ?? 0) + value;
        if (newCurrent === target.current) return state;
      }

      const newObjectives = state.objectives.map((obj) => {
        if (obj.type !== objectiveType) return obj;
        const newCurrent = mode === 'set' ? value : (obj.current ?? 0) + value;
        return { ...obj, current: newCurrent, isComplete: newCurrent >= obj.target };
      });

      return {
        ...state,
        objectives: newObjectives,
        gameState: {
          ...state.gameState,
          stars: calculateStars(newObjectives),
        },
      };
    }

    default:
      return state;
  }
}
