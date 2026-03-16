/**
 * GameGridArea Component
 *
 * Organized grid area with feedback, word preview, and the game board.
 * Uses React AdventureGrid for grid rendering.
 * Board is wrapped with BoardFrame for world-themed edge decorations.
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHUDTheme } from '@/contexts/AdventureThemeContext';
import AdventureGrid from '../AdventureGrid';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import type { GridTileState } from '@/types/adventure';

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

  // World theming
  worldId?: number;

  // Locked tiles from boss abilities
  lockedTileIndices?: number[];

  // Hint
  hintLevel: 'none' | 'length' | 'lengthAndStart' | 'fullReveal';


  // Boss grid effect
  bossGridEffect?: { name: string; id: number } | null;

  /** Indices of tiles adjacent to the last selected tile (for selection hints) */
  adjacentIndices?: number[];

  className?: string;
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
  hintLevel,
  bossGridEffect,
  adjacentIndices,
  lockedTileIndices,
  className,
}: GameGridAreaProps) {
  const { t } = useLanguage();
  const hudTheme = useHUDTheme();

  // Use prop if provided, otherwise build from selected indices (backward compat)
  const currentWord = currentWordProp ?? selectedIndices.map(i => tiles[i]?.letter || '').join('');

  return (
    <div
      className={cn(
        'flex flex-col',
        'h-full w-full',
        'relative',
        className
      )}
    >
      {/*
        Top Section: Word Preview + Feedback.
        Mobile: single flex row (word left, feedback right) — saves ~24px of height.
        sm+:    stacked column, each row gets a fixed height.
        Total cost: h-8 on mobile vs h-8+h-7=h-15 on sm+.
      */}
      <div className="flex-shrink-0 px-2 sm:px-4 pt-0.5 sm:pt-2 pb-0">
        <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-x-1.5 sm:gap-y-1 overflow-hidden">
          {/* Word Preview */}
          <div className="h-8 flex items-center justify-center shrink min-w-0 sm:w-full">
            <WordFormingArea
              word={currentWord}
              letterCount={selectedLength}
              feedback={wordFeedback}
              compact
            />
          </div>

          {/* Feedback Area */}
          <div data-testid="feedback-container" className="h-7 flex items-center justify-center sm:w-full">
            <AnimatePresence mode="wait">
              {/* Validation Error */}
              {validationError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.9 }}
                  className={cn(
                    'px-3 py-1 rounded-neo',
                    'bg-neo-red/20 border-2 border-neo-red',
                    'text-neo-red font-bold text-xs sm:text-sm',
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
                  className="text-neo-cyan font-bold text-xs sm:text-sm animate-pulse"
                >
                  {t('common.validating')}
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
                    'px-2 py-0.5 rounded-full',
                    'bg-neo-white/10 border border-neo-white/20',
                    'text-neo-white/70 text-xs font-medium',
                    'flex items-center gap-1.5'
                  )}
                >
                  <span>
                    {minWordLength === 2
                      ? t('adventure.hints.minLetters2')
                      : t('adventure.hints.minLetters3')
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
      </div>

      {/* Main Content - Centered vertically and horizontally (grid only) */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2 sm:px-4 py-1">
        {/*
          Grid Container.
          Old: max-w-md (448px) — too narrow on phone, leaves dead space on tablet.
          New: w-full with a square clamp.
            - `min(100%, 80vh)` lets the grid grow to full container width but
              never exceed 80% of the viewport height (keeps it square & visible).
            - On landscape/desktop the sidebar eats width, so 80vh naturally caps.
            - On portrait mobile the sidebar is only h-16, so 80vh ≈ useful space.
        */}
        <div className="flex-1 flex items-center justify-center min-h-0 w-full" style={{ maxWidth: 'min(100%, 75dvh, 520px)' }}>
          <motion.div
            className={cn(
              'w-full aspect-square max-h-full rounded-neo-lg',
              // Stronger glow when a word is accepted — ring + outer shadow pulse
              wasWordSubmitted && lastAccepted
                ? 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy/80 shadow-[0_0_24px_4px_rgba(163,230,53,0.45)]'
                : 'ring-0'
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
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
                adjacentIndices={adjacentIndices}
                bossGridEffect={bossGridEffect}
                lockedTileIndices={lockedTileIndices}
                className="h-full"
              />
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
