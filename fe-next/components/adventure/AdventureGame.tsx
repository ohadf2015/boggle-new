/**
 * AdventureGame Component
 *
 * Main orchestrator for adventure mode gameplay.
 * Combines grid, objectives, timer, and level completion flow.
 */

'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { Pause, Play, LogOut, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { useAdventureSelection } from '@/hooks/useAdventureSelection';
import { useLexiReactions, type GameStateForReactions } from '@/hooks/useLexiReactions';
import { useAdventureHints } from '@/hooks/useAdventureHints';
import { ScorePopupFly } from '@/components/animations';
import AdventureGrid from './AdventureGrid';
import AdventureObjectives from './AdventureObjectives';
import AdventureTimer from './AdventureTimer';
import LevelCompleteModal from './LevelCompleteModal';
import LevelEntryOverlay from './LevelEntryOverlay';
import LexiReaction from './LexiReaction';
import WorldBackground from './themed/WorldBackground';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

/** Timer state for parent coordination with music hook */
export interface GameTimerState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

interface AdventureGameProps {
  /** Level configuration */
  levelConfig: LevelConfig;
  /** Initial grid letters (2D array) */
  initialGrid: string[][];
  /** Callback when level is completed */
  onLevelComplete: (stars: number, score: number) => void;
  /** Callback to exit the game */
  onExit: () => void;
  /** Callback to report timer state to parent (for music coordination) */
  onTimerStateChange?: (timerState: GameTimerState) => void;
  /** Total stars accumulated across all levels */
  totalStars?: number;
}

interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
  bonus?: string;
}

interface LastReportedTimerState {
  isPlaying: boolean;
  isPaused: boolean;
  phase: string;
  timeRemaining: number;
}

interface ValidationFeedback {
  error: string | null;
  wasSubmitted: boolean;
  isValid: boolean;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Flatten 2D TileState array and add id/row/col
 */
function flattenTiles(tiles2D: TileState[][]): GridTileState[] {
  const flat: GridTileState[] = [];
  for (let row = 0; row < tiles2D.length; row++) {
    for (let col = 0; col < tiles2D[row].length; col++) {
      flat.push({
        ...tiles2D[row][col],
        id: `tile-${row}-${col}`,
        row,
        col,
      });
    }
  }
  return flat;
}

/**
 * Compare 2D tile arrays for equality (avoiding new references)
 * Returns true if tiles are structurally identical
 */
function tilesEqual(a: TileState[][], b: TileState[][]): boolean {
  if (a.length !== b.length) return false;
  for (let row = 0; row < a.length; row++) {
    if (a[row].length !== b[row].length) return false;
    for (let col = 0; col < a[row].length; col++) {
      const tileA = a[row][col];
      const tileB = b[row][col];
      // Compare relevant tile properties from TileState interface
      if (
        tileA.letter !== tileB.letter ||
        tileA.type !== tileB.type ||
        tileA.isCleared !== tileB.isCleared ||
        tileA.isFrozen !== tileB.isFrozen ||
        tileA.isChained !== tileB.isChained
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Hook to memoize flattened tiles with structural equality check
 * Prevents unnecessary re-renders when tiles2D reference changes but content is same
 */
function useMemoizedFlatTiles(tiles2D: TileState[][]): GridTileState[] {
  const prevTilesRef = useRef<TileState[][] | null>(null);
  const flatTilesRef = useRef<GridTileState[]>([]);

  // Only recompute if tiles actually changed
  if (!prevTilesRef.current || !tilesEqual(prevTilesRef.current, tiles2D)) {
    prevTilesRef.current = tiles2D;
    flatTilesRef.current = flattenTiles(tiles2D);
  }

  return flatTilesRef.current;
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureGame = memo<AdventureGameProps>(
  ({ levelConfig, initialGrid, onLevelComplete, onExit, onTimerStateChange, totalStars }) => {
    // Validate config
    const isValidConfig = levelConfig.gridSize > 0 && levelConfig.objectives.length > 0;

    // Game state from hook
    const {
      gameState,
      tiles: tiles2D,
      objectives,
      timeRemaining,
      canComplete,
      isPlaying,
      cascadeComplete,
      submitWordWithPath,
      startGame,
      pauseGame,
      completeLevel,
      resetGame,
      markCascadeComplete,
    } = useAdventureGame({
      levelConfig,
      initialGrid,
    });

    // Flatten tiles for AdventureGrid component (uses structural equality)
    const tiles = useMemoizedFlatTiles(tiles2D);

    // Language context for translations
    const { t, language } = useLanguage();

    // Progression context for recording attempts
    const { recordAttempt, getLevelAttempt } = useProgression();

    // Get best attempt for this level (for partial progress display)
    const bestAttempt = useMemo(
      () => getLevelAttempt(levelConfig.world, levelConfig.level),
      [getLevelAttempt, levelConfig.world, levelConfig.level]
    );

    // Local UI state
    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [popupQueue, setPopupQueue] = useState<ScorePopup[]>([]);

    // Consolidated validation feedback state
    const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback>({
      error: null,
      wasSubmitted: false,
      isValid: false,
    });

    // Refs for timeout cleanup
    const validationErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wordSubmittedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popupQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track entry sequence phases
    const [entryPhase, setEntryPhase] = useState<'cascade' | 'objectives' | 'title' | 'playing'>('cascade');

    // Ref for score display target (for ScorePopupFly animation)
    const scoreDisplayRef = useRef<HTMLDivElement>(null);

    // Cleanup all timeouts on unmount
    useEffect(() => {
      return () => {
        if (validationErrorTimeoutRef.current) {
          clearTimeout(validationErrorTimeoutRef.current);
        }
        if (wordSubmittedTimeoutRef.current) {
          clearTimeout(wordSubmittedTimeoutRef.current);
        }
        if (popupQueueTimeoutRef.current) {
          clearTimeout(popupQueueTimeoutRef.current);
        }
      };
    }, []);

    // Current popup from queue
    const currentPopup = popupQueue[0] ?? null;

    // Word validation hook (must come before selection hook which depends on isValidating)
    // Pass tiles for score calculation with special tile multipliers (gold 3x, rainbow 1.25x)
    const { validateWord, isValidating } = useAdventureWordValidation({
      grid: initialGrid,
      language: language || 'en',
      minWordLength: 3,
      foundWords: gameState.wordsFound,
      tiles: tiles2D,
    });

    // Ref to grid for coordinate calculation
    const gridRef = useRef<HTMLDivElement>(null);

    // Selection hook with adjacency validation
    const {
      selectedIndices,
      currentWord,
      selectTile,
      clearSelection,
      getPath,
      pathPoints,
    } = useAdventureSelection({
      tiles,
      gridSize: levelConfig.gridSize,
      disabled: !isPlaying || isPaused || isValidating,
      gridRef,
    });

    // Hint system hook
    const {
      hasHintsAvailable,
      getHint,
      currentHint,
      clearCurrentHint,
      recordActivity,
      showAutoHint,
      dismissAutoHint,
    } = useAdventureHints({
      grid: initialGrid,
      language: language || 'en',
      foundWords: gameState.wordsFound,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
      inactivityThresholdMs: 15000, // 15 seconds
    });

    // Lexi reaction state - transform game state to reaction format
    // Using ref + selective update to avoid recreating object on every timer tick
    const lexiGameStateRef = useRef<GameStateForReactions>({
      wordsFound: [],
      comboCount: 0,
      timeRemaining: 0,
      isComplete: false,
      stars: 0,
      worldId: 1,
    });

    // Only update ref when non-timer values change (timer ticks shouldn't trigger reactions)
    const lexiGameState = useMemo(() => {
      const ref = lexiGameStateRef.current;
      // Check if significant values changed (not just timeRemaining)
      const significantChange =
        ref.wordsFound !== gameState.wordsFound ||
        ref.comboCount !== gameState.comboCount ||
        ref.isComplete !== gameState.isComplete ||
        ref.stars !== gameState.stars ||
        ref.worldId !== levelConfig.world;

      if (significantChange) {
        lexiGameStateRef.current = {
          wordsFound: gameState.wordsFound,
          comboCount: gameState.comboCount,
          timeRemaining,
          isComplete: gameState.isComplete,
          stars: gameState.stars,
          worldId: levelConfig.world,
        };
      } else {
        // Update timeRemaining without creating new object
        ref.timeRemaining = timeRemaining;
      }
      return lexiGameStateRef.current;
    }, [gameState.wordsFound, gameState.comboCount, timeRemaining, gameState.isComplete, gameState.stars, levelConfig.world]);

    // Lexi reactions hook
    const { reaction, dismissReaction } = useLexiReactions({
      gameState: lexiGameState,
      isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
    });

    // Report timer state to parent for music coordination
    // Parent (AdventureView) owns the useAdventureMusic hook to play music on all screens
    // Performance: Only report on significant changes (not every second tick)
    const lastReportedStateRef = useRef<LastReportedTimerState | null>(null);

    useEffect(() => {
      const actuallyPlaying = isPlaying && entryPhase === 'playing';
      const lastState = lastReportedStateRef.current;

      // Determine if this is a significant change worth reporting
      const isSignificantChange =
        !lastState ||
        lastState.isPlaying !== actuallyPlaying ||
        lastState.isPaused !== isPaused ||
        lastState.phase !== entryPhase ||
        // Report every 5 seconds during gameplay, or when time is critical (<10s)
        Math.floor(lastState.timeRemaining / 5) !== Math.floor(timeRemaining / 5) ||
        timeRemaining <= 10;

      if (isSignificantChange && onTimerStateChange) {
        lastReportedStateRef.current = {
          isPlaying: actuallyPlaying,
          isPaused,
          phase: entryPhase,
          timeRemaining,
        };
        onTimerStateChange({
          timeRemaining,
          totalTime: levelConfig.timerSeconds,
          isPlaying: actuallyPlaying,
          isPaused,
        });
      }
    }, [timeRemaining, isPlaying, isPaused, entryPhase, onTimerStateChange, levelConfig.timerSeconds]);

    // Handle cascade completion to advance to objectives phase
    const handleCascadeComplete = useCallback(() => {
      markCascadeComplete();
      setEntryPhase('objectives');
    }, [markCascadeComplete]);

    // Handle objectives slide-in completion to advance to title phase
    const handleObjectivesComplete = useCallback(() => {
      setEntryPhase('title');
    }, []);

    // Handle title animation completion to start gameplay
    const handleTitleComplete = useCallback(() => {
      setEntryPhase('playing');
      if (!isPlaying) {
        startGame();
      }
    }, [isPlaying, startGame]);

    // Check for level completion and record attempt
    useEffect(() => {
      if (gameState.isComplete || timeRemaining === 0) {
        setShowLevelComplete(true);
        pauseGame();

        // Record attempt (including failures) for partial progress tracking
        // Build objective progress map from current objectives
        const objectiveProgress: Record<string, number> = {};
        for (const obj of objectives) {
          objectiveProgress[obj.type] = obj.current ?? 0;
        }

        // Record the attempt (stars > 0 means completion)
        recordAttempt(
          levelConfig.world,
          levelConfig.level,
          gameState.wordsFound.length,
          gameState.score,
          timeRemaining,
          objectiveProgress,
          gameState.stars > 0
        );
      }
    }, [
      gameState.isComplete,
      timeRemaining,
      pauseGame,
      recordAttempt,
      levelConfig.world,
      levelConfig.level,
      gameState.wordsFound.length,
      gameState.score,
      gameState.stars,
      objectives,
    ]);

    // Helper to calculate popup start position from last selected tile
    const getPopupStartPosition = useCallback(() => {
      // Get position of last selected tile (center of word)
      if (selectedIndices.length === 0) {
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }

      const lastIndex = selectedIndices[selectedIndices.length - 1];
      const gridElement = gridRef.current;
      const tileElement = gridElement?.querySelectorAll('[role="gridcell"]')[lastIndex];

      if (tileElement) {
        const rect = tileElement.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }, [selectedIndices]);

    // Handle pause toggle
    const handlePauseToggle = useCallback(() => {
      if (isPaused) {
        startGame();
        setIsPaused(false);
      } else {
        pauseGame();
        setIsPaused(true);
      }
    }, [isPaused, startGame, pauseGame]);

    // Handle tile selection (for click)
    const handleTileSelect = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, selectTile]
    );

    // Handle drag start
    const handleDragStart = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        // Clear previous selection and start new one
        clearSelection();
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, clearSelection, selectTile]
    );

    // Handle drag enter (when dragging over tiles)
    const handleDragEnter = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused || isValidating) return;
        selectTile(index);
      },
      [isPlaying, isPaused, isValidating, selectTile]
    );

    // Handle word submission with validation
    const handleWordSubmit = useCallback(
      async (_word: string, _indices: number[]) => {
        // Use currentWord and getPath() from selection hook for validated path
        if (!isPlaying || isPaused || currentWord.length < 3 || isValidating) return;

        // Clear previous timeouts to prevent stale state updates
        if (validationErrorTimeoutRef.current) {
          clearTimeout(validationErrorTimeoutRef.current);
          validationErrorTimeoutRef.current = null;
        }
        if (wordSubmittedTimeoutRef.current) {
          clearTimeout(wordSubmittedTimeoutRef.current);
          wordSubmittedTimeoutRef.current = null;
        }

        // Clear any previous error
        setValidationFeedback(prev => ({ ...prev, error: null }));

        // Get validated path from selection hook
        const path = getPath();

        // Validate word
        const result = await validateWord(currentWord, path);

        if (result.isValid && result.score) {
          // Get position BEFORE clearing selection
          const startPos = getPopupStartPosition();
          const scoreValue = result.score;
          const comboBonus = gameState.comboCount > 1 ? `${gameState.comboCount}x` : undefined;

          // Add score popup to queue
          setPopupQueue(prev => [...prev, {
            id: Date.now(),
            value: scoreValue,
            x: startPos.x,
            y: startPos.y,
            word: currentWord,
            bonus: comboBonus,
          }]);

          // Valid word - submit with calculated score and path for special tile effects
          setValidationFeedback({ error: null, isValid: true, wasSubmitted: true });
          submitWordWithPath(currentWord, scoreValue, path);
          clearSelection();
          // Clear any hint and reset inactivity timer
          clearCurrentHint();
          recordActivity();

          // Reset after animation duration with proper cleanup
          wordSubmittedTimeoutRef.current = setTimeout(() => {
            setValidationFeedback({ error: null, wasSubmitted: false, isValid: false });
          }, 400);
        } else if (result.errorKey) {
          // Invalid word - show error
          const errorMessage = t(result.errorKey) || result.errorKey;
          setValidationFeedback({ error: errorMessage, isValid: false, wasSubmitted: false });
          clearSelection();

          // Clear error after 2 seconds with proper cleanup
          validationErrorTimeoutRef.current = setTimeout(() => {
            setValidationFeedback(prev => ({ ...prev, error: null }));
          }, 2000);
        }
      },
      [isPlaying, isPaused, isValidating, currentWord, getPath, validateWord, submitWordWithPath, clearSelection, t, getPopupStartPosition, gameState.comboCount, clearCurrentHint, recordActivity]
    );

    // Handle level complete continue
    const handleContinue = useCallback(() => {
      setShowLevelComplete(false);
      onLevelComplete(gameState.stars, gameState.score);
    }, [gameState.stars, gameState.score, onLevelComplete]);

    // Handle retry
    const handleRetry = useCallback(() => {
      setShowLevelComplete(false);
      clearSelection();
      resetGame();
      startGame();
    }, [resetGame, startGame, clearSelection]);

    // Handle exit - directly use onExit since no additional logic needed
    const handleExit = onExit;

    // Handle hint button click
    const handleHintClick = useCallback(() => {
      if (hasHintsAvailable) {
        getHint();
        dismissAutoHint();
      }
    }, [hasHintsAvailable, getHint, dismissAutoHint]);

    // Convert hint path to indices for grid highlighting
    const hintHighlightIndices = useMemo(() => {
      if (!currentHint?.path) return [];
      return currentHint.path.map(pos => pos.row * levelConfig.gridSize + pos.col);
    }, [currentHint, levelConfig.gridSize]);

    // Handle score popup completion with safety timeout fallback
    const handlePopupComplete = useCallback(() => {
      // Clear safety timeout when popup completes normally
      if (popupQueueTimeoutRef.current) {
        clearTimeout(popupQueueTimeoutRef.current);
        popupQueueTimeoutRef.current = null;
      }
      setPopupQueue(prev => prev.slice(1));
    }, []);

    // Safety mechanism: clear stuck popups after max duration
    useEffect(() => {
      if (currentPopup && !popupQueueTimeoutRef.current) {
        const POPUP_MAX_DURATION_MS = 3000; // Max 3 seconds per popup
        popupQueueTimeoutRef.current = setTimeout(() => {
          setPopupQueue(prev => prev.slice(1));
          popupQueueTimeoutRef.current = null;
        }, POPUP_MAX_DURATION_MS);
      }
    }, [currentPopup]);

    // Calculate star count for display
    const starsEarned = gameState.stars;

    // Render error state for invalid config
    if (!isValidConfig) {
      return (
        <div
          data-testid="adventure-game"
          role="main"
          className="flex items-center justify-center h-full"
        >
          <p className="text-neo-red font-bold">Invalid level configuration</p>
        </div>
      );
    }

    return (
      <div
        data-testid="adventure-game"
        role="main"
        aria-label="Adventure Mode Game"
        className={cn(
          'relative flex flex-col h-full',
          'text-neo-white'
        )}
      >
        {/* Themed World Background - reduced parallax for gameplay focus */}
        <WorldBackground
          className="absolute inset-0 -z-10"
          parallaxIntensity={0.2}
          enableAmbient={false}
        />

        {/* Header */}
        <header
          className={cn(
            'flex items-center justify-between',
            'px-4 py-3',
            'bg-neo-navy/80 border-b-2 border-neo-black/30'
          )}
        >
          {/* Level Info */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black">Level {levelConfig.level}</h1>
            <div
              ref={scoreDisplayRef}
              data-testid="score-display"
              className="font-mono font-bold"
            >
              {gameState.score}
            </div>
          </div>

          {/* Timer and Pause */}
          <div className="flex items-center gap-3">
            <AdventureTimer timeRemaining={timeRemaining} size="compact" />
            <button
              onClick={handlePauseToggle}
              aria-label={isPaused ? 'Resume' : 'Pause'}
              className={cn(
                'p-2 rounded-neo',
                'bg-neo-white/10 hover:bg-neo-white/20',
                'transition-colors duration-200'
              )}
            >
              {isPaused ? (
                <Play className="w-5 h-5" />
              ) : (
                <Pause className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Main Game Area */}
        <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto min-h-0">
          {/* Grid Section */}
          <div className="flex-shrink-0 lg:flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
            {/* Feedback Container - Always reserve space to prevent layout shift */}
            <div
              data-testid="feedback-container"
              className="min-h-[40px] flex items-center justify-center"
            >
              {/* Validation Feedback */}
              {validationFeedback.error && (
                <div
                  data-testid="validation-error"
                  className={cn(
                    'px-4 py-2 rounded-neo',
                    'bg-neo-red/20 border-2 border-neo-red',
                    'text-neo-red font-bold text-sm',
                    'animate-neo-shake'
                  )}
                >
                  {validationFeedback.error}
                </div>
              )}

              {/* Loading Indicator */}
              {isValidating && (
                <div
                  data-testid="validation-loading"
                  className="text-neo-cyan font-bold text-sm animate-pulse"
                >
                  {t('common.validating') || 'Validating...'}
                </div>
              )}
            </div>

            <AdventureGrid
              ref={gridRef}
              tiles={tiles}
              gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices}
              onTileSelect={handleTileSelect}
              onWordSubmit={handleWordSubmit}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              interactive={entryPhase === 'playing' && isPlaying && !isPaused && !isValidating}
              disabled={entryPhase !== 'playing' || !isPlaying || isPaused || isValidating}
              showWordPreview
              className="max-w-md w-full"
              pathPoints={pathPoints}
              isWordValid={validationFeedback.isValid}
              wasWordSubmitted={validationFeedback.wasSubmitted}
              showCascade={entryPhase === 'cascade'}
              onCascadeComplete={handleCascadeComplete}
              hintHighlightIndices={hintHighlightIndices}
            />
          </div>

          {/* Sidebar - Objectives & Combo */}
          <aside
            className={cn(
              'flex-shrink-0 lg:w-64 flex flex-col gap-4',
              'lg:border-l-2 lg:border-neo-black/20 lg:pl-4',
              // Enhanced glass effect with higher opacity for better readability
              'p-4 rounded-neo',
              'bg-neo-navy/95 backdrop-blur-lg',
              'border-2 border-neo-white/20',
              'shadow-hard'
            )}
          >
            {/* Objectives */}
            <div>
              <h2 className="text-sm font-bold text-neo-white/80 uppercase tracking-wide mb-2">
                {t('adventure.game.objectives')}
              </h2>
              <AdventureObjectives
                objectives={objectives}
                showSlideIn={entryPhase === 'objectives'}
                onSlideInComplete={handleObjectivesComplete}
              />
            </div>

            {/* Combo Display */}
            <div
              data-testid="combo-display"
              className={cn(
                'p-3 rounded-neo',
                'bg-neo-black/30 border-2 border-neo-cyan/30'
              )}
            >
              <p className="text-sm font-bold text-neo-white/70 uppercase tracking-wide mb-1">
                {t('adventure.game.combo')}
              </p>
              <p className="text-2xl font-black text-neo-cyan drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
                x{gameState.comboCount}
              </p>
            </div>

            {/* Hint Button */}
            <button
              onClick={handleHintClick}
              disabled={!hasHintsAvailable}
              data-testid="hint-button"
              aria-label={t('adventure.game.hint')}
              className={cn(
                'flex items-center justify-center gap-2',
                'p-3 rounded-neo',
                'font-bold transition-all duration-200',
                hasHintsAvailable
                  ? 'bg-neo-yellow text-neo-black border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed'
                  : 'bg-neo-black/30 text-neo-white/40 border-2 border-neo-white/10 cursor-not-allowed'
              )}
            >
              <Lightbulb className="w-5 h-5" />
              {t('adventure.game.hint')}
            </button>

            {/* Auto-Hint Prompt */}
            {showAutoHint && (
              <div
                data-testid="auto-hint-prompt"
                className={cn(
                  'p-3 rounded-neo',
                  'bg-neo-yellow/20 border-2 border-neo-yellow/50',
                  'animate-neo-pop'
                )}
              >
                <p className="text-sm font-bold text-neo-yellow text-center">
                  {t('adventure.game.hintAvailable')}
                </p>
              </div>
            )}

            {/* Current Hint Display */}
            {currentHint && (
              <div
                data-testid="current-hint-display"
                className={cn(
                  'p-3 rounded-neo',
                  'bg-neo-lime/20 border-2 border-neo-lime/50'
                )}
              >
                <p className="text-sm font-bold text-neo-lime text-center">
                  {t('adventure.game.hintUsed')}
                </p>
                <p className="text-lg font-black text-neo-white text-center mt-1">
                  {currentHint.word}
                </p>
              </div>
            )}
          </aside>
        </main>

        {/* Pause Overlay */}
        {isPaused && !showLevelComplete && (
          <div
            data-testid="pause-overlay"
            className={cn(
              'absolute inset-0 z-40',
              'flex flex-col items-center justify-center',
              'bg-neo-black/80 backdrop-blur-sm'
            )}
          >
            <h2 className="text-3xl font-black mb-8">{t('adventure.game.paused')}</h2>
            <div className="flex flex-col gap-4 w-48">
              <button
                onClick={handlePauseToggle}
                aria-label={t('common.resume')}
                className={cn(
                  'py-3 px-6',
                  'bg-neo-lime text-neo-black',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                {t('common.resume')}
              </button>
              <button
                onClick={handleExit}
                aria-label={t('common.exit')}
                className={cn(
                  'py-3 px-6',
                  'flex items-center justify-center gap-2',
                  'bg-neo-white/10 text-neo-white',
                  'font-bold',
                  'border-2 border-neo-white/20 rounded-neo',
                  'hover:bg-neo-white/20 hover:border-neo-white/30',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime',
                  'transition-all duration-200'
                )}
              >
                <LogOut className="w-5 h-5" />
                {t('common.exit')}
              </button>
            </div>
          </div>
        )}

        {/* Level Entry Overlay - shows during title phase */}
        <LevelEntryOverlay
          levelNumber={levelConfig.level}
          worldNumber={levelConfig.world}
          isVisible={entryPhase === 'title'}
          onComplete={handleTitleComplete}
        />

        {/* Level Complete Modal */}
        <LevelCompleteModal
          isOpen={showLevelComplete}
          stars={starsEarned}
          score={gameState.score}
          objectives={objectives}
          levelNumber={levelConfig.level}
          worldNumber={levelConfig.world}
          onContinue={handleContinue}
          onRetry={handleRetry}
          onExit={handleExit}
          totalStars={totalStars}
          bestAttempt={bestAttempt}
        />

        {/* Score Popup Animation */}
        <ScorePopupFly
          popup={currentPopup}
          targetRef={scoreDisplayRef}
          flyToTarget
          showWord
          size="md"
          duration={1800}
          onComplete={handlePopupComplete}
        />

        {/* Lexi Mascot Reactions */}
        <LexiReaction
          reaction={reaction}
          onDismiss={dismissReaction}
        />
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
