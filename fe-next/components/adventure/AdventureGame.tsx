/**
 * AdventureGame Component
 *
 * Main orchestrator for adventure mode gameplay.
 * Combines grid, objectives, timer, and level completion flow.
 */

'use client';

import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { Pause, Play, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { useAdventureSelection } from '@/hooks/useAdventureSelection';
import { ScorePopupFly } from '@/components/animations';
import AdventureGrid from './AdventureGrid';
import AdventureObjectives from './AdventureObjectives';
import AdventureTimer from './AdventureTimer';
import LevelCompleteModal from './LevelCompleteModal';
import WorldBackground from './themed/WorldBackground';
import type { LevelConfig, TileState, GridTileState } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface AdventureGameProps {
  /** Level configuration */
  levelConfig: LevelConfig;
  /** Initial grid letters (2D array) */
  initialGrid: string[][];
  /** Callback when level is completed */
  onLevelComplete: (stars: number, score: number) => void;
  /** Callback to exit the game */
  onExit: () => void;
}

interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
  bonus?: string;
}

// ==============================================
// HELPER: Flatten 2D TileState array and add id/row/col
// ==============================================

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

// ==============================================
// COMPONENT
// ==============================================

const AdventureGame = memo<AdventureGameProps>(
  ({ levelConfig, initialGrid, onLevelComplete, onExit }) => {
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
      submitWord,
      startGame,
      pauseGame,
      completeLevel,
      resetGame,
    } = useAdventureGame({
      levelConfig,
      initialGrid,
    });

    // Flatten tiles for AdventureGrid component
    const tiles = useMemo(() => flattenTiles(tiles2D), [tiles2D]);

    // Language context for translations
    const { t, language } = useLanguage();

    // Local UI state
    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [wasWordSubmitted, setWasWordSubmitted] = useState(false);
    const [isWordValid, setIsWordValid] = useState(false);
    const [popupQueue, setPopupQueue] = useState<ScorePopup[]>([]);

    // Ref for score display target (for ScorePopupFly animation)
    const scoreDisplayRef = useRef<HTMLDivElement>(null);

    // Current popup from queue
    const currentPopup = popupQueue[0] ?? null;

    // Word validation hook (must come before selection hook which depends on isValidating)
    const { validateWord, isValidating } = useAdventureWordValidation({
      grid: initialGrid,
      language: language || 'en',
      minWordLength: 3,
      foundWords: gameState.wordsFound,
    });

    // Ref to grid for coordinate calculation
    const gridRef = React.useRef<HTMLDivElement | null>(null);

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

    // Start game on mount
    useEffect(() => {
      if (isValidConfig) {
        startGame();
      }
    }, [isValidConfig, startGame]);

    // Check for level completion
    useEffect(() => {
      if (gameState.isComplete || timeRemaining === 0) {
        setShowLevelComplete(true);
        pauseGame();
      }
    }, [gameState.isComplete, timeRemaining, pauseGame]);

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

        // Clear any previous error
        setValidationError(null);

        // Get validated path from selection hook
        const path = getPath();

        // Validate word
        const result = await validateWord(currentWord, path);

        if (result.isValid && result.score) {
          // Get position BEFORE clearing selection
          const startPos = getPopupStartPosition();

          // Store score value for TypeScript
          const scoreValue = result.score;

          // Calculate bonus string from combo
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

          // Valid word - submit with calculated score
          setIsWordValid(true);
          setWasWordSubmitted(true);
          submitWord(currentWord, scoreValue);
          clearSelection();
          // Reset after animation duration
          setTimeout(() => {
            setWasWordSubmitted(false);
            setIsWordValid(false);
          }, 400);
        } else if (result.errorKey) {
          // Invalid word - show error
          setIsWordValid(false);
          setValidationError(t(result.errorKey) || result.errorKey);
          clearSelection();

          // Clear error after 2 seconds
          setTimeout(() => setValidationError(null), 2000);
        }
      },
      [isPlaying, isPaused, isValidating, currentWord, getPath, validateWord, submitWord, clearSelection, t, getPopupStartPosition, gameState.comboCount]
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

    // Handle exit from pause menu
    const handleExit = useCallback(() => {
      onExit();
    }, [onExit]);

    // Handle score popup completion
    const handlePopupComplete = useCallback(() => {
      setPopupQueue(prev => prev.slice(1));
    }, []);

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
        {/* Themed World Background */}
        <WorldBackground className="absolute inset-0 -z-10" />

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
        <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
          {/* Grid Section */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {/* Validation Feedback */}
            {validationError && (
              <div
                data-testid="validation-error"
                className={cn(
                  'px-4 py-2 rounded-neo',
                  'bg-neo-red/20 border-2 border-neo-red',
                  'text-neo-red font-bold text-sm',
                  'animate-neo-shake'
                )}
              >
                {validationError}
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

            <AdventureGrid
              ref={gridRef}
              tiles={tiles}
              gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices}
              onTileSelect={handleTileSelect}
              onWordSubmit={handleWordSubmit}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              interactive={isPlaying && !isPaused && !isValidating}
              disabled={!isPlaying || isPaused || isValidating}
              showWordPreview
              className="max-w-md w-full"
              pathPoints={pathPoints}
              isWordValid={isWordValid}
              wasWordSubmitted={wasWordSubmitted}
            />
          </div>

          {/* Sidebar - Objectives & Combo */}
          <aside
            className={cn(
              'lg:w-64 flex flex-col gap-4',
              'lg:border-l-2 lg:border-neo-black/20 lg:pl-4'
            )}
          >
            {/* Objectives */}
            <div>
              <h2 className="text-sm font-bold text-neo-white/60 uppercase tracking-wide mb-2">
                Objectives
              </h2>
              <AdventureObjectives objectives={objectives} />
            </div>

            {/* Combo Display */}
            <div
              data-testid="combo-display"
              className={cn(
                'p-3 rounded-neo',
                'bg-neo-white/5 border-2 border-neo-white/10'
              )}
            >
              <p className="text-sm font-bold text-neo-white/60 uppercase tracking-wide mb-1">
                Combo
              </p>
              <p className="text-2xl font-black text-neo-cyan">
                x{gameState.comboCount}
              </p>
            </div>
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
            <h2 className="text-3xl font-black mb-8">Paused</h2>
            <div className="flex flex-col gap-4 w-48">
              <button
                onClick={handlePauseToggle}
                aria-label="Resume"
                className={cn(
                  'py-3 px-6',
                  'bg-neo-lime text-neo-black',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-sm',
                  'transition-all duration-200'
                )}
              >
                Resume
              </button>
              <button
                onClick={handleExit}
                aria-label="Exit"
                className={cn(
                  'py-3 px-6',
                  'flex items-center justify-center gap-2',
                  'bg-neo-white/10 text-neo-white',
                  'font-bold',
                  'border-2 border-neo-white/20 rounded-neo',
                  'hover:bg-neo-white/20',
                  'transition-colors duration-200'
                )}
              >
                <LogOut className="w-5 h-5" />
                Exit
              </button>
            </div>
          </div>
        )}

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
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
