/**
 * AdventureGame Component
 *
 * Main orchestrator for adventure mode gameplay.
 * Combines grid, objectives, timer, and level completion flow.
 */

'use client';

import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { Pause, Play, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import AdventureGrid from './AdventureGrid';
import AdventureObjectives from './AdventureObjectives';
import AdventureTimer from './AdventureTimer';
import LevelCompleteModal from './LevelCompleteModal';
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

    // Local UI state
    const [isPaused, setIsPaused] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

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

    // Handle tile selection
    const handleTileSelect = useCallback(
      (index: number, _tile: GridTileState) => {
        if (!isPlaying || isPaused) return;

        setSelectedIndices((prev) => {
          // If tile already selected, deselect
          if (prev.includes(index)) {
            return prev.filter((i) => i !== index);
          }
          // Add to selection
          return [...prev, index];
        });
      },
      [isPlaying, isPaused]
    );

    // Handle word submission
    const handleWordSubmit = useCallback(
      (word: string, indices: number[]) => {
        if (!isPlaying || isPaused || word.length < 3) return;

        // Calculate base score (simple implementation)
        const baseScore = word.length * 10;
        submitWord(word, baseScore);
        setSelectedIndices([]);
      },
      [isPlaying, isPaused, submitWord]
    );

    // Handle level complete continue
    const handleContinue = useCallback(() => {
      setShowLevelComplete(false);
      onLevelComplete(gameState.stars, gameState.score);
    }, [gameState.stars, gameState.score, onLevelComplete]);

    // Handle retry
    const handleRetry = useCallback(() => {
      setShowLevelComplete(false);
      setSelectedIndices([]);
      resetGame();
      startGame();
    }, [resetGame, startGame]);

    // Handle exit from pause menu
    const handleExit = useCallback(() => {
      onExit();
    }, [onExit]);

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
          'bg-neo-navy text-neo-white'
        )}
      >
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
            <div data-testid="score-display" className="font-mono font-bold">
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
          <div className="flex-1 flex items-center justify-center">
            <AdventureGrid
              tiles={tiles}
              gridSize={levelConfig.gridSize}
              selectedIndices={selectedIndices}
              onTileSelect={handleTileSelect}
              onWordSubmit={handleWordSubmit}
              interactive={isPlaying && !isPaused}
              disabled={!isPlaying || isPaused}
              showWordPreview
              className="max-w-md w-full"
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
      </div>
    );
  }
);

AdventureGame.displayName = 'AdventureGame';

export default AdventureGame;
