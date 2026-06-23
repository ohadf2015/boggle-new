/** Pure reducer and helpers for adventure game state management. */

import type {
  LevelConfig,
  TileState,
  LevelObjective,
  AdventureGameState,
  TileType,
  TileActivationEffect,
} from '@/types/adventure';
import { isThemedWord, getThemeBonusMultiplier } from '@/lib/adventure/themedWords';
import { computeLetterFeedback, HUNT_WRONG_GUESS_DAMAGE, HUNT_MAX_ATTEMPTS } from '@/lib/adventure/huntMode';

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
  | { type: 'UPDATE_OBJECTIVE'; payload: { objectiveType: string; value: number; mode: 'set' | 'increment' } }
  | { type: 'TAKE_DAMAGE'; payload: { amount: number } }
  | { type: 'HEAL'; payload: { amount: number } }
  | { type: 'SET_HUNT_TARGET'; payload: { targetWord: string } }
  | { type: 'SUBMIT_HUNT_GUESS'; payload: { guess: string } };

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
  /** Upgrade tier map for UI effects (upgradeId -> tier). Set at initialization. */
  upgradeState?: Record<string, number>;
  /** Set when an upgrade visually triggers this action (e.g. deepDrill melts extra ice). Cleared on next action. */
  upgradeTriggered: { upgradeId: string; effectValue: number } | null;
  /** Words from the current world's themed pool that the player has found */
  themedWordsFound: string[];
  /** Whether the most recently submitted word was a themed word */
  lastWordWasThemed: boolean;
  /** Blast mode: moves remaining (undefined = not move-limited) */
  movesRemaining?: number;
  /** Hunt mode: current hit points (undefined = not life-based) */
  currentHP?: number;
  /** Hunt mode: maximum hit points */
  maxHP?: number;
  /** Hunt mode: hidden target word (uppercase) */
  huntTargetWord?: string;
  /** Hunt mode: previous guess attempts with Wordle-style feedback */
  huntAttempts?: Array<{ guess: string; feedback: import('@/shared/types/game').LetterFeedback[] }>;
  /** Hunt mode: whether the target has been found */
  huntFound?: boolean;
}

const GOLD_MULTIPLIER = 3;
const LONG_WORD_LENGTH = 5;
const TIME_TILE_BONUS_SECONDS = 5;
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
  upgradeState?: Record<string, number>,
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
    upgradeState,
    upgradeTriggered: null,
    themedWordsFound: [],
    lastWordWasThemed: false,
    freezeRemaining: 0,
    freezeUsed: false,
    shufflesRemaining: upgradeConfig?.shuffleUses ?? 0,
    movesRemaining: levelConfig.movesLimit,
    currentHP: levelConfig.lifePoints,
    maxHP: levelConfig.lifePoints,
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
 * True when there is genuinely nothing left to do: every objective (primary
 * AND secondary) has reached its target. Used to end a level the instant all
 * quests are done, so players never wait out the timer on a finished board.
 * Empty objective lists return false (no false-complete on `[].every()`).
 */
export function allObjectivesComplete(objectives: LevelObjective[]): boolean {
  if (objectives.length === 0) return false;
  return objectives.every((o) => (o.current ?? 0) >= o.target);
}

/**
 * Process special tile effects when a word is submitted with a path.
 * Mutates newTiles in place and returns computed bonuses.
 */
function processSpecialTileEffects(
  path: Array<{ row: number; col: number }>,
  newTiles: TileState[][],
  gridSize: number,
  baseScore: number,
  upgradeConfig?: ReducerUpgradeConfig,
  upgradeState?: Record<string, number>,
): { finalScore: number; iceClearedCount: number; timeBonusSeconds: number; deepDrillIceCleared: number; triggeredUpgrades: Array<{ upgradeId: string; effectValue: number }> } {
  let finalScore = baseScore;
  let iceClearedCount = 0;
  let timeBonusSeconds = 0;
  let deepDrillIceCleared = 0;
  const triggeredUpgrades: Array<{ upgradeId: string; effectValue: number }> = [];
  const activationTimestamp = Date.now();

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

  // Bomb tile - "Score Bomb": doubles word score (Blast Shield T2: also gives +5s)
  const bombPos = path.find(
    (pos) => newTiles[pos.row]?.[pos.col]?.type === 'bomb'
  );
  if (bombPos) {
    finalScore *= 2;
    const tile = newTiles[bombPos.row][bombPos.col];
    if (tile) {
      tile.activationEffect = 'explode';
      tile.activationTimestamp = activationTimestamp;
      tile.isCleared = true;
    }
    if (upgradeConfig?.bombTimerInvert) {
      timeBonusSeconds += TIME_TILE_BONUS_SECONDS;
      triggeredUpgrades.push({ upgradeId: 'blastShield', effectValue: TIME_TILE_BONUS_SECONDS });
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

  // Track ice cleared by deepDrill upgrade (when upgrade is active and ice was cleared)
  if (upgradeState && (upgradeState['deepDrill'] ?? 0) > 0 && iceClearedCount > 0) {
    deepDrillIceCleared = iceClearedCount;
    triggeredUpgrades.push({ upgradeId: 'deepDrill', effectValue: iceClearedCount });
  }

  // Track gold multiplier from luckyPickaxe
  if (upgradeState && (upgradeState['luckyPickaxe'] ?? 0) > 0 && goldPositions.length > 0) {
    triggeredUpgrades.push({ upgradeId: 'luckyPickaxe', effectValue: goldPositions.length });
  }

  return { finalScore, iceClearedCount, timeBonusSeconds, deepDrillIceCleared, triggeredUpgrades };
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

      // Move-based (blast) and life-based (hunt) levels have no timer
      if (state.movesRemaining != null || state.currentHP != null) {
        return state;
      }

      // Time Freeze: decrement freeze counter instead of game timer
      if (state.freezeRemaining > 0) {
        return { ...state, freezeRemaining: state.freezeRemaining - 1 };
      }

      const newTime = Math.max(0, state.timeRemaining - 1);
      if (newTime === 0) {
        // Evaluate timeBonus objectives with final remaining time (0)
        const finalObjectives = state.objectives.map((obj) => {
          if (obj.type === 'timeBonus') {
            return { ...obj, current: 0, isComplete: false };
          }
          return obj;
        });
        return {
          ...state,
          timeRemaining: 0,
          isPlaying: false,
          objectives: finalObjectives,
          gameState: {
            ...state.gameState,
            isComplete: true,
            stars: calculateStars(finalObjectives),
          },
        };
      }

      // Update timeBonus objectives with current remaining time so stars
      // are calculated correctly at completion
      const updatedObjectives = state.objectives.map((obj) => {
        if (obj.type === 'timeBonus') {
          const isComplete = newTime >= obj.target;
          return { ...obj, current: newTime, isComplete };
        }
        return obj;
      });

      return { ...state, timeRemaining: newTime, objectives: updatedObjectives };
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

      // Clear upgradeTriggered from previous action
      // Apply themed word bonus
      const world = state.levelConfig.world;
      const themed = world > 0 && isThemedWord(world, word);
      let baseScore = score;
      if (themed) {
        baseScore = Math.round(score * getThemeBonusMultiplier(world));
      }

      // Process tile effects
      let finalScore = baseScore;
      let iceClearedCount = 0;
      let timeBonusSeconds = 0;
      let tileTriggeredUpgrades: Array<{ upgradeId: string; effectValue: number }> = [];

      if (path && path.length > 0) {
        const effects = processSpecialTileEffects(
          path,
          newTiles,
          gridSize,
          baseScore,
          state.upgradeConfig,
          state.upgradeState,
        );
        finalScore = effects.finalScore;
        iceClearedCount = effects.iceClearedCount;
        timeBonusSeconds = effects.timeBonusSeconds;
        tileTriggeredUpgrades = effects.triggeredUpgrades;
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
          case 'collectGems':
            // Count gold tiles collected in this word
            if (path) {
              newCurrent += path.filter(
                (pos) => state.tiles[pos.row]?.[pos.col]?.type === 'gold'
              ).length;
            }
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

      // Collect all upgrade triggers from tile effects
      const allTriggers = [...tileTriggeredUpgrades];

      // Word Dynamite detonation trigger
      if (detonate && path && path.length > 0) {
        allTriggers.push({ upgradeId: 'wordDynamite', effectValue: path.length });
      }

      // Pick the most impactful trigger to show (rarest/most visible first)
      const triggerPriority = ['wordDynamite', 'blastShield', 'deepDrill', 'luckyPickaxe'];
      const newUpgradeTriggered = allTriggers.length > 0
        ? allTriggers.sort((a, b) =>
            triggerPriority.indexOf(a.upgradeId) - triggerPriority.indexOf(b.upgradeId)
          )[0]
        : null;

      // Blast mode: decrement moves remaining
      const newMovesRemaining = state.movesRemaining != null
        ? state.movesRemaining - 1
        : undefined;
      const movesExhausted = newMovesRemaining != null && newMovesRemaining <= 0;

      // End the level when all objectives done (non-boss) OR moves run out (blast mode).
      const allQuestsDone = !state.levelConfig.isBossLevel && allObjectivesComplete(newObjectives);
      const isComplete = allQuestsDone || movesExhausted;

      const resultState: GameState = {
        ...state,
        tiles: newTiles,
        tilesVersion: state.tilesVersion + 1,
        objectives: newObjectives,
        timeRemaining: newTimeRemaining,
        upgradeTriggered: newUpgradeTriggered,
        lastWordWasThemed: themed,
        themedWordsFound: themed
          ? [...state.themedWordsFound, word]
          : state.themedWordsFound,
        movesRemaining: newMovesRemaining,
        gameState: {
          ...state.gameState,
          score: state.gameState.score + finalScore,
          wordsFound: [...state.gameState.wordsFound, word],
          comboCount: newComboCount,
          ...(isComplete ? { isComplete: true, stars: calculateStars(newObjectives) } : {}),
        },
        ...(isComplete ? { isPlaying: false } : {}),
      };

      return resultState;
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
        upgradeTriggered: { upgradeId: 'timeFreeze', effectValue: action.payload.seconds },
      };
    }

    case 'USE_SHUFFLE': {
      if (state.shufflesRemaining <= 0) return state;
      // Shuffle regenerates the grid — the actual grid regen is handled
      // by the caller dispatching REGENERATE_GRID after USE_SHUFFLE
      return {
        ...state,
        shufflesRemaining: state.shufflesRemaining - 1,
        upgradeTriggered: { upgradeId: 'wordDynamite', effectValue: state.shufflesRemaining },
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

      // Non-objective updates (e.g. mechanicTrigger) can be the last quest to
      // complete — end the level here too. Boss levels are owned by the boss flow.
      const allQuestsDone =
        state.isPlaying &&
        !state.levelConfig.isBossLevel &&
        allObjectivesComplete(newObjectives);

      return {
        ...state,
        objectives: newObjectives,
        ...(allQuestsDone ? { isPlaying: false } : {}),
        gameState: {
          ...state.gameState,
          stars: calculateStars(newObjectives),
          ...(allQuestsDone ? { isComplete: true } : {}),
        },
      };
    }

    case 'TAKE_DAMAGE': {
      if (state.currentHP == null) return state;
      const newHP = Math.max(0, state.currentHP - action.payload.amount);
      if (newHP <= 0) {
        return {
          ...state,
          currentHP: 0,
          isPlaying: false,
          gameState: { ...state.gameState, isComplete: true, stars: calculateStars(state.objectives) },
        };
      }
      return { ...state, currentHP: newHP };
    }

    case 'HEAL': {
      if (state.currentHP == null || state.maxHP == null) return state;
      return { ...state, currentHP: Math.min(state.currentHP + action.payload.amount, state.maxHP) };
    }

    case 'SET_HUNT_TARGET': {
      return {
        ...state,
        huntTargetWord: action.payload.targetWord.toUpperCase(),
        huntAttempts: [],
        huntFound: false,
      };
    }

    case 'SUBMIT_HUNT_GUESS': {
      if (!state.huntTargetWord || state.huntFound) return state;
      const guess = action.payload.guess.toUpperCase();
      const target = state.huntTargetWord;
      const feedback = computeLetterFeedback(guess, target);
      const isCorrect = guess === target;
      const newAttempts = [...(state.huntAttempts ?? []), { guess, feedback }];

      if (isCorrect) {
        // Found the target — complete the level
        const updatedObjectives = state.objectives.map((obj) =>
          obj.type === 'wordCount' ? { ...obj, current: obj.target, isComplete: true } : obj,
        );
        return {
          ...state,
          huntAttempts: newAttempts,
          huntFound: true,
          objectives: updatedObjectives,
          gameState: {
            ...state.gameState,
            score: state.gameState.score + target.length * 100,
            isComplete: true,
            stars: calculateStars(updatedObjectives),
          },
          isPlaying: false,
        };
      }

      // Wrong guess — take damage
      const newHP = state.currentHP != null
        ? Math.max(0, state.currentHP - HUNT_WRONG_GUESS_DAMAGE)
        : undefined;
      const isDead = newHP != null && newHP <= 0;
      const maxAttemptsReached = HUNT_MAX_ATTEMPTS > 0 && newAttempts.length >= HUNT_MAX_ATTEMPTS;
      const isGameOver = isDead || maxAttemptsReached;

      return {
        ...state,
        huntAttempts: newAttempts,
        currentHP: newHP,
        isPlaying: isGameOver ? false : state.isPlaying,
        gameState: isGameOver
          ? { ...state.gameState, isComplete: true, stars: calculateStars(state.objectives) }
          : state.gameState,
      };
    }

    default:
      return state;
  }
}
