/**
 * useAdventureGame Hook
 *
 * Manages adventure game state including tiles, objectives, timer, and score.
 * Handles special tile effects and level completion logic.
 *
 * Exposes a `timerStore` (pub/sub) that mirrors `timeRemaining` so that leaf
 * components (AdventureTimer) can subscribe directly via useSyncExternalStore,
 * isolating per-second re-renders from sibling component subtrees.
 */

import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  LevelConfig,
  TileState,
  LevelObjective,
  AdventureGameState,
} from '@/types/adventure';
import { WORLDS_COUNT, LEVELS_PER_WORLD, generateAdventureGrid } from '@/lib/adventure';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import type { Language } from '@/types';
import { useCascadeLoop, type CascadePhase } from './useCascadeLoop';
import { gameReducer, createInitialState, type ReducerUpgradeConfig } from './adventureGameReducer';
import { useAdventureTimerStore, type AdventureTimerStore } from './useAdventureTimerStore';


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
  /** Upgrade tier map (upgradeId → tier) for HUD trigger tracking */
  upgradeState?: Record<string, number>;
  /** Language for grid generation (used by shuffle). Defaults to 'en'. */
  language?: Language;
}

interface UseAdventureGameReturn {
  gameState: AdventureGameState;
  tiles: TileState[][];
  tilesVersion: number;
  objectives: LevelObjective[];
  timeRemaining: number;
  /**
   * Pub/sub store that mirrors timeRemaining. Pass to AdventureTimer (via
   * GameHeader) so it subscribes directly and re-renders independently of
   * sibling components. Use `useAdventureTimerValue(timerStore)` to subscribe.
   */
  timerStore: AdventureTimerStore;
  canComplete: boolean;
  isPlaying: boolean;
  cascadeComplete: boolean;
  submitWord: (word: string, score: number) => void;
  submitWordWithPath: (
    word: string,
    score: number,
    path: Array<{ row: number; col: number }>,
    options?: { detonate?: boolean }
  ) => void;
  startGame: () => void;
  pauseGame: () => void;
  completeLevel: () => void;
  resetGame: (options?: { retainedScore?: number }) => void;
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
  /** Update a specific objective (for boss events, collectGems, etc.) */
  updateObjective: (objectiveType: string, value: number, mode?: 'set' | 'increment') => void;
  /** Effective combo timeout in ms (accounts for upgrade multiplier) */
  effectiveComboTimeout: number;
  /** Upgrade tier map for HUD display (upgradeId -> tier). */
  upgradeState: Record<string, number>;
  /** Set when an upgrade visually triggers this action. Cleared on next action. */
  upgradeTriggered: { upgradeId: string; effectValue: number } | null;
  /** Themed words found in the current level */
  themedWordsFound: string[];
  /** Whether the most recently submitted word was a themed word */
  lastWordWasThemed: boolean;
  /** Blast mode: moves remaining (undefined if not move-limited) */
  movesRemaining?: number;
  /** Hunt mode: current HP (undefined if not life-based) */
  currentHP?: number;
  /** Hunt mode: max HP */
  maxHP?: number;
  /** Dispatch TAKE_DAMAGE to reduce HP (hunt mode) */
  takeDamage: (amount: number) => void;
  /** Dispatch HEAL to restore HP (hunt mode) */
  heal: (amount: number) => void;
  /** Hunt mode state */
  huntTargetWord?: string;
  huntAttempts?: Array<{ guess: string; feedback: import('@/shared/types/game').LetterFeedback[] }>;
  huntFound?: boolean;
  /** Set the hunt target word */
  setHuntTarget: (word: string) => void;
  /** Submit a hunt guess */
  submitHuntGuess: (guess: string) => void;
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
  upgradeState,
  language = 'en',
}: UseAdventureGameProps): UseAdventureGameReturn {
  // world=0 is valid for weekly challenges (special non-progression mode)
  if (levelConfig.world < 0 || levelConfig.world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${levelConfig.world}`);
  }
  if (levelConfig.level < 1 || levelConfig.level > LEVELS_PER_WORLD) {
    throw new Error(`Invalid level: ${levelConfig.level}`);
  }

  const initialState = useMemo(
    () => createInitialState(levelConfig, initialGrid, upgradeConfig, upgradeState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelConfig, initialGrid]
  );

  const [state, dispatch] = useReducer(gameReducer, initialState);

  const cascade = useCascadeLoop({
    onPhaseChange: (_phase: CascadePhase) => {},
  });

  // Keep cascade's tile reference in sync with the reducer's tile grid
  // so gravity and spawn calculations operate on real data (not empty []).
  useEffect(() => {
    cascade.updateTiles(state.tiles);
  }, [state.tiles, cascade]);

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pub/sub store that mirrors timeRemaining for leaf-component subscriptions.
  // AdventureTimer subscribes via useAdventureTimerValue(timerStore) so only
  // the timer widget re-renders on tick, not sibling components.
  const timerStore = useAdventureTimerStore(levelConfig.timerSeconds);

  // Sync store whenever reducer's timeRemaining changes (every TICK, time tile
  // bonus, ADD_TIME, RESET_GAME, etc.). The store is a passive mirror — no
  // interval of its own; the reducer drives it.
  useEffect(() => {
    timerStore.notify(state.timeRemaining);
  }, [timerStore, state.timeRemaining]);

  // Timer effect - only depends on isPlaying
  // Boss levels have no countdown timer — the fight lasts until boss dies or player dies.
  // We still dispatch TICK for elapsed-time tracking but the reducer won't decrement.
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
    (word: string, score: number, path: Array<{ row: number; col: number }>, options?: { detonate?: boolean }) => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      dispatch({ type: 'SUBMIT_WORD', payload: { word, score, path, detonate: options?.detonate } });

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

    const fresh = createInitialState(levelConfig, initialGrid, upgradeConfig, upgradeState);
    if (options?.retainedScore && options.retainedScore > 0) {
      fresh.gameState = { ...fresh.gameState, score: options.retainedScore };
    }
    dispatch({ type: 'RESET_GAME', payload: { initialState: fresh } });
  }, [levelConfig, initialGrid, upgradeConfig, upgradeState]);


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

  const updateObjective = useCallback((objectiveType: string, value: number, mode: 'set' | 'increment' = 'set') => {
    dispatch({ type: 'UPDATE_OBJECTIVE', payload: { objectiveType, value, mode } });
  }, []);

  const takeDamage = useCallback((amount: number) => {
    dispatch({ type: 'TAKE_DAMAGE', payload: { amount } });
  }, []);

  const heal = useCallback((amount: number) => {
    dispatch({ type: 'HEAL', payload: { amount } });
  }, []);

  const setHuntTarget = useCallback((word: string) => {
    dispatch({ type: 'SET_HUNT_TARGET', payload: { targetWord: word } });
  }, []);

  const submitHuntGuess = useCallback((guess: string) => {
    dispatch({ type: 'SUBMIT_HUNT_GUESS', payload: { guess } });
  }, []);

  const isShufflingRef = useRef(false);
  const useShuffle = useCallback(() => {
    if (state.shufflesRemaining <= 0 || isShufflingRef.current) return;
    isShufflingRef.current = true;
    dispatch({ type: 'USE_SHUFFLE' });
    // Regenerate the grid with language-aware letter distribution
    const gridSize = levelConfig.gridSize as 4 | 5 | 6 | 7;
    const freshGrid = pickRichestBoardClient(
      () => generateAdventureGrid(gridSize, undefined, language),
      language
    );
    dispatch({ type: 'REGENERATE_GRID', payload: { grid: freshGrid } });
    // Release guard after React processes the state update
    requestAnimationFrame(() => { isShufflingRef.current = false; });
  }, [state.shufflesRemaining, levelConfig.gridSize, language]);

  return {
    gameState: state.gameState,
    tiles: state.tiles,
    tilesVersion: state.tilesVersion,
    objectives: state.objectives,
    timeRemaining: state.timeRemaining,
    timerStore,
    canComplete,
    isPlaying: state.isPlaying,
    cascadeComplete: state.cascadeComplete,
    submitWord,
    submitWordWithPath,
    startGame,
    pauseGame,
    completeLevel,
    resetGame,
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
    updateObjective,
    effectiveComboTimeout,
    upgradeState: state.upgradeState ?? {},
    upgradeTriggered: state.upgradeTriggered,
    themedWordsFound: state.themedWordsFound,
    lastWordWasThemed: state.lastWordWasThemed,
    movesRemaining: state.movesRemaining,
    currentHP: state.currentHP,
    maxHP: state.maxHP,
    takeDamage,
    heal,
    huntTargetWord: state.huntTargetWord,
    huntAttempts: state.huntAttempts,
    huntFound: state.huntFound,
    setHuntTarget,
    submitHuntGuess,
  };
}
