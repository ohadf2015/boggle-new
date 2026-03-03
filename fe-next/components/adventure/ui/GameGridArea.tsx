/**
 * GameGridArea Component
 *
 * Organized grid area with feedback, word preview, and the game board.
 * Uses Phaser (AdventureScene) for grid rendering by default, with
 * React AdventureGrid as error boundary fallback.
 * Board is wrapped with BoardFrame for world-themed edge decorations.
 */

'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHUDTheme } from '@/contexts/AdventureThemeContext';
import AdventureGrid from '../AdventureGrid';
import BoardFrame from '../themed/BoardFrame';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { PhaserGameAdventure } from '@/components/phaser/PhaserGameAdventure';
import type { GridTileState } from '@/types/adventure';

/** Convert flat GridTileState[] to 2D string[][] for Phaser */
function tilesToGrid(tiles: GridTileState[], gridSize: number): string[][] {
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  tiles.forEach((tile) => {
    if (tile.row < gridSize && tile.col < gridSize) {
      grid[tile.row][tile.col] = tile.letter;
    }
  });
  return grid;
}

/** Build tileStates record for Phaser adventure overlays */
function tilesToStateMap(tiles: GridTileState[]): Record<string, string> {
  const map: Record<string, string> = {};
  tiles.forEach((tile) => {
    if (tile.type !== 'standard') {
      map[`${tile.row},${tile.col}`] = tile.type;
    }
  });
  return map;
}

// ==============================================
// TYPES
// ==============================================

interface GameGridAreaProps {
  // Grid props
  tiles: GridTileState[];
  gridSize: number;
  selectedIndices: number[];
  onTileSelect: (index: number, tile: GridTileState) => void;
  onWordSubmit: (word: string, indices: number[]) => void;
  onDragStart: (index: number, tile: GridTileState) => void;
  onDragEnter: (index: number, tile: GridTileState) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;

  // State
  isInteractive: boolean;
  isDisabled: boolean;
  entryPhase: string;
  showCascade: boolean;
  onCascadeComplete: () => void;
  hintHighlightIndices: number[];
  pathPoints: Array<{ x: number; y: number; timestamp: number }>;

  // Feedback
  validationError: string | null;
  isValidating: boolean;
  isWordValid: boolean;
  wasWordSubmitted: boolean;
  lastAccepted: { word: string; score: number } | null;
  selectedLength: number;
  minWordLength: number;

  // WordFormingArea integration
  wordFeedback?: WordFeedback | null;
  currentWord?: string;

  // Phaser grid
  comboCount?: number;

  // World theming
  worldId?: number;

  // Locked tiles from boss abilities
  lockedTileIndices?: number[];

  // Hint
  hintLevel: 'none' | 'length' | 'lengthAndStart' | 'fullReveal';

  // Phaser word change callback (for live drag preview)
  onPhaserWordChange?: (word: string) => void;

  className?: string;
}

// ==============================================
// ERROR BOUNDARY
// ==============================================

class PhaserErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ==============================================
// COMPONENT
// ==============================================

export const GameGridArea = memo(function GameGridArea({
  tiles,
  gridSize,
  selectedIndices,
  onTileSelect,
  onWordSubmit,
  onDragStart,
  onDragEnter,
  gridRef,
  isInteractive,
  isDisabled,
  entryPhase,
  showCascade,
  onCascadeComplete,
  hintHighlightIndices,
  pathPoints,
  validationError,
  isValidating,
  isWordValid,
  wasWordSubmitted,
  lastAccepted,
  selectedLength,
  minWordLength,
  wordFeedback,
  currentWord: currentWordProp,
  comboCount,
  worldId,
  lockedTileIndices,
  hintLevel,
  onPhaserWordChange,
  className,
}: GameGridAreaProps) {
  const { t } = useLanguage();
  const hudTheme = useHUDTheme();

  // Use prop if provided, otherwise build from selected indices (backward compat)
  const currentWord = currentWordProp ?? selectedIndices.map(i => tiles[i]?.letter || '').join('');

  // React AdventureGrid fallback — used if Phaser crashes via error boundary
  const adventureGridFallback = (
    <AdventureGrid
      ref={gridRef}
      tiles={tiles}
      gridSize={gridSize}
      selectedIndices={selectedIndices}
      onTileSelect={onTileSelect}
      onWordSubmit={onWordSubmit}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      interactive={isInteractive}
      disabled={isDisabled}
      showWordPreview={false}
      pathPoints={pathPoints}
      isWordValid={isWordValid}
      wasWordSubmitted={wasWordSubmitted}
      showCascade={showCascade}
      onCascadeComplete={onCascadeComplete}
      hintHighlightIndices={hintHighlightIndices}
      className="h-full"
    />
  );

  return (
    <div
      className={cn(
        'flex flex-col',
        'h-full w-full',
        'relative',
        className
      )}
    >
      {/* Top Section: Word Preview & Feedback — pinned above the board */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 px-2 sm:px-4 pt-1 sm:pt-2 pb-0">
        {/* Word Preview — uses shared WordFormingArea for consistent feedback */}
        <div className="h-8 sm:h-10 flex items-center justify-center">
          <WordFormingArea
            word={currentWord}
            letterCount={selectedLength}
            feedback={wordFeedback}
            compact
          />
        </div>

        {/* Feedback Area */}
        <div data-testid="feedback-container" className="h-6 sm:h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {/* Validation Error */}
            {validationError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className={cn(
                  'px-3 py-1.5 rounded-neo',
                  'bg-neo-red/20 border-2 border-neo-red',
                  'text-neo-red font-bold text-sm',
                  'animate-neo-shake'
                )}
              >
                {validationError}
              </motion.div>
            )}

            {/* Validating Indicator */}
            {!validationError && isValidating && (
              <motion.div
                key="validating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-neo-cyan font-bold text-sm animate-pulse"
              >
                {t('common.validating') || 'Validating...'}
              </motion.div>
            )}

            {/* Word Length Hint */}
            {!validationError && !isValidating && selectedLength > 0 && selectedLength < minWordLength && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  'px-3 py-1 rounded-full',
                  'bg-neo-white/10 border border-neo-white/20',
                  'text-neo-white/70 text-sm font-medium',
                  'flex items-center gap-2'
                )}
              >
                <span>
                  {minWordLength === 2
                    ? t('adventure.hints.minLetters2') || '2+ letters'
                    : t('adventure.hints.minLetters3') || '3+ letters'
                  }
                </span>
                <span className="font-black text-neo-lime">
                  {selectedLength}/{minWordLength}
                </span>
              </motion.div>
            )}

            {/* Empty spacer */}
            {!validationError && !isValidating && (selectedLength === 0 || selectedLength >= minWordLength) && (
              <div key="empty" className="w-full" />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content - Centered vertically and horizontally (grid only) */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2 sm:px-4 py-1">
        {/* Grid Container - Takes available space but doesn't overflow */}
        <div className="flex-1 flex items-center justify-center min-h-0 w-full max-w-md lg:max-w-lg">
          <motion.div
            className={cn(
              'w-full aspect-square max-h-full rounded-neo-lg',
              wasWordSubmitted && lastAccepted && 'ring-2 ring-neo-lime/60'
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <BoardFrame>
              <PhaserErrorBoundary fallback={adventureGridFallback}>
                <div className="relative w-full h-full">
                  <PhaserGameAdventure
                    grid={tilesToGrid(tiles, gridSize)}
                    comboLevel={comboCount ?? 0}
                    tileStates={tilesToStateMap(tiles)}
                    wordFeedback={wordFeedback}
                    worldId={worldId}
                    lockedTileIndices={lockedTileIndices}
                    hintCells={hintHighlightIndices.map((i) => ({
                      row: Math.floor(i / gridSize),
                      col: i % gridSize,
                    }))}
                    onWordSubmit={(word, path) => {
                      const indices = path.map(cell => cell.row * gridSize + cell.col);
                      onWordSubmit(word, indices);
                    }}
                    onWordChange={(word) => {
                      onPhaserWordChange?.(word);
                    }}
                  />
                </div>
              </PhaserErrorBoundary>
            </BoardFrame>
          </motion.div>
        </div>

        {/* Hint Message - Bottom of grid area */}
        <div className="h-6 shrink-0 flex items-center justify-center mt-1">
          <AnimatePresence>
            {hintLevel !== 'none' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn('text-xs text-center px-4', hudTheme.scoreAccent, 'opacity-80')}
              >
                {hintLevel === 'fullReveal'
                  ? t('adventure.game.hintFullReveal')
                  : hintLevel === 'lengthAndStart'
                    ? t('adventure.game.hintLengthAndStart')
                    : t('adventure.game.hintGeneral')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

GameGridArea.displayName = 'GameGridArea';

export default GameGridArea;
