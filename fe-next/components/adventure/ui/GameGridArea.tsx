/**
 * GameGridArea Component
 *
 * Organized grid area with feedback, word preview, and the game board.
 * Uses React AdventureGrid for grid rendering.
 * Board is wrapped with BoardFrame for world-themed edge decorations.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
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
  onDragEnd?: () => void;
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
  /** @deprecated Validation errors now displayed by WordFormingArea */
  validationError?: string | null;
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

  /** Center letter required for wheel mode (null = not required) */
  centerLetter?: string | null;

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
  onDragEnd,
  gridRef,
  isInteractive,
  isDisabled,
  showCascade,
  onCascadeComplete,
  hintHighlightIndices,
  pathPoints,
  // validationError is deprecated — feedback now handled by WordFormingArea
  isValidating,
  isWordValid,
  wasWordSubmitted,
  lastAccepted,
  selectedLength,
  minWordLength,
  wordFeedback,
  currentWord: currentWordProp,
  centerLetter,
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
      <div className="shrink-0 px-2 sm:px-4 pt-0.5 sm:pt-2 pb-0">
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

          {/* Feedback Area — validation errors are shown by WordFormingArea above */}
          <div data-testid="feedback-container" className="h-7 flex items-center justify-center sm:w-full">
            <AdaptiveAnimatePresence mode="wait">
              {/* Validating Indicator */}
              {isValidating && (
                <AdaptiveMotion.div
                  key="validating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-neo-cyan font-bold text-xs sm:text-sm animate-pulse"
                >
                  {t('common.validating')}
                </AdaptiveMotion.div>
              )}

              {/* Word Length Hint */}
              {!isValidating && selectedLength > 0 && selectedLength < minWordLength && (
                <AdaptiveMotion.div
                  key="hint"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    'px-2 py-0.5 rounded-full',
                    'bg-neo-white/10 border border-neo-white/20',
                    'text-neo-white text-xs font-medium',
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
                </AdaptiveMotion.div>
              )}

              {/* Empty spacer */}
              {!isValidating && (selectedLength === 0 || selectedLength >= minWordLength) && (
                <div key="empty" className="w-full" />
              )}
            </AdaptiveAnimatePresence>
          </div>
        </div>
      </div>

      {/* Center letter indicator (wheel mode) — prominent glow matching standalone WordWheel */}
      {centerLetter && (
        <div className="shrink-0 flex items-center justify-center py-1.5">
          <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-neo-purple/20 border-2 border-neo-purple/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <span className="text-xs text-neo-white font-bold uppercase tracking-wide">{t('adventure.mode.wheelMustInclude')}</span>
            <span className="w-8 h-8 rounded-full bg-neo-purple/30 border-2 border-neo-purple flex items-center justify-center text-lg font-black text-neo-purple uppercase shadow-[0_0_8px_rgba(139,92,246,0.4)]">
              {centerLetter}
            </span>
          </div>
        </div>
      )}

      {/* Main Content - Centered vertically and horizontally (grid only) */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2 sm:px-4 py-1" style={{ containerType: 'size' }}>
        {/*
          Grid Container — uses container query height (cqh) so sizing adapts
          to the actual available space in the flex container, not the viewport.
          - 88cqh keeps the grid within its parent (leaves room for word preview + hint).
          - 760px caps on very large screens to keep tiles readable but fills desktop space.
          - 100% width ensures full-width on narrow phones.
        */}
        <div className="flex-1 flex items-center justify-center min-h-0 w-full" style={{ maxWidth: 'min(100%, 88cqh, 760px)' }}>
          <AdaptiveMotion.div
            className={cn(
              // `adventure-grid-container` opts the inner GridComponent out of the
              // legacy mobile-landscape `.game-board-frame` width/height rules in
              // animations.css. Without it, those rules force explicit width AND
              // height on .game-board-frame; flex-shrink then squashes width to
              // fit this aspect-square parent while height stays at the CSS
              // value, producing rectangular cells. Mirrors the existing
              // .desktop-grid-container / .tv-grid-container pattern.
              'adventure-grid-container w-full aspect-square max-h-full rounded-neo-lg',
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
                onDragEnd={onDragEnd}
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
          </AdaptiveMotion.div>
        </div>

        {/* Hint Message - Bottom of grid area */}
        <div className="h-6 shrink-0 flex items-center justify-center mt-1">
          <AdaptiveAnimatePresence>
            {hintLevel !== 'none' && (
              <AdaptiveMotion.div
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
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
        </div>
      </div>
    </div>
  );
});

GameGridArea.displayName = 'GameGridArea';

export default GameGridArea;
