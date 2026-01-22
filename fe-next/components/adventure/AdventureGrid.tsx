/**
 * AdventureGrid Component
 *
 * Adventure mode grid wrapper that renders special tiles (gold, ice, bomb, rainbow)
 * and handles tile selection for word formation.
 */

'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { GridTileState, TileType } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface AdventureGridProps {
  /** Array of tile states with position info for the grid */
  tiles: GridTileState[];
  /** Grid dimension (4 for 4x4, 5 for 5x5) */
  gridSize: number;
  /** Indices of currently selected tiles */
  selectedIndices?: number[];
  /** Whether grid is interactive */
  interactive?: boolean;
  /** Whether grid is disabled */
  disabled?: boolean;
  /** Show word preview above grid */
  showWordPreview?: boolean;
  /** Callback when tile is selected */
  onTileSelect?: (index: number, tile: GridTileState) => void;
  /** Callback when word is submitted */
  onWordSubmit?: (word: string, indices: number[]) => void;
  /** Additional CSS classes */
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const TILE_TYPE_CLASSES: Record<TileType, string> = {
  standard: '',
  gold: 'tile-gold',
  ice: 'tile-ice',
  bomb: 'tile-bomb',
  rainbow: 'tile-rainbow',
};

const TILE_TYPE_LABELS: Record<TileType, string> = {
  standard: '',
  gold: 'gold tile (3x multiplier)',
  ice: 'ice tile (obstacle)',
  bomb: 'bomb tile (clears row)',
  rainbow: 'rainbow tile (wildcard)',
};

const GRID_COLS_CLASSES: Record<number, string> = {
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

// ==============================================
// COMPONENT
// ==============================================

const AdventureGrid = memo<AdventureGridProps>(
  ({
    tiles,
    gridSize,
    selectedIndices = [],
    interactive = false,
    disabled = false,
    showWordPreview = false,
    onTileSelect,
    onWordSubmit,
    className,
  }) => {
    // Build selected set for quick lookup
    const selectedSet = useMemo(
      () => new Set(selectedIndices),
      [selectedIndices]
    );

    // Build formed word from selected tiles
    const formedWord = useMemo(() => {
      return selectedIndices.map((idx) => tiles[idx]?.letter || '').join('');
    }, [selectedIndices, tiles]);

    // Handle tile click
    const handleTileClick = useCallback(
      (index: number, tile: GridTileState) => {
        if (disabled || tile.isCleared) return;
        if (interactive && onTileSelect) {
          onTileSelect(index, tile);
        }
      },
      [disabled, interactive, onTileSelect]
    );

    // Handle word submission (on mouse/touch up)
    const handleMouseUp = useCallback(() => {
      if (disabled || selectedIndices.length === 0) return;
      if (onWordSubmit) {
        onWordSubmit(formedWord, selectedIndices);
      }
    }, [disabled, selectedIndices, formedWord, onWordSubmit]);

    // Get aria-label for tile
    const getTileAriaLabel = useCallback((tile: GridTileState): string => {
      const baseLabel = `Letter ${tile.letter}`;
      const typeLabel = TILE_TYPE_LABELS[tile.type];
      return typeLabel ? `${baseLabel}, ${typeLabel}` : baseLabel;
    }, []);

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Word Preview */}
        {showWordPreview && formedWord.length > 0 && (
          <div
            className={cn(
              'text-center text-2xl font-black text-neo-white',
              'bg-neo-navy/60 rounded-neo px-4 py-2'
            )}
          >
            {formedWord}
          </div>
        )}

        {/* Grid */}
        <div
          role="grid"
          aria-label="Adventure game board"
          onMouseUp={interactive ? handleMouseUp : undefined}
          onTouchEnd={interactive ? handleMouseUp : undefined}
          className={cn(
            'adventure-grid',
            'grid gap-1 p-2',
            'bg-neo-navy/40 rounded-neo',
            'select-none touch-none',
            GRID_COLS_CLASSES[gridSize] || 'grid-cols-4',
            disabled && 'adventure-grid-disabled opacity-60 pointer-events-none'
          )}
        >
          {tiles.map((tile, index) => {
            const isSelected = selectedSet.has(index);
            const canInteract = interactive && !disabled && !tile.isCleared;

            return (
              <div
                key={tile.id}
                role="gridcell"
                aria-label={getTileAriaLabel(tile)}
                aria-selected={isSelected}
                onClick={() => handleTileClick(index, tile)}
                style={{
                  animationDelay: tile.cascadeDelay
                    ? `${tile.cascadeDelay}ms`
                    : undefined,
                }}
                className={cn(
                  // Base tile styles
                  'relative aspect-square flex items-center justify-center',
                  'font-black text-xl cursor-pointer overflow-hidden',
                  'border-2 border-neo-black/30 rounded-neo',
                  'transition-all duration-200',

                  // Type-specific classes
                  TILE_TYPE_CLASSES[tile.type],

                  // State classes
                  tile.isCleared && 'tile-cleared opacity-40 cursor-not-allowed',
                  isSelected &&
                    'tile-selected ring-2 ring-neo-cyan z-10 scale-105',
                  tile.isFrozen && tile.type === 'ice' && 'tile-frozen',

                  // Standard tile background
                  tile.type === 'standard' &&
                    'bg-gradient-to-br from-neo-white via-gray-100 to-gray-200 text-neo-black',

                  // Gold tile - golden glow
                  tile.type === 'gold' && [
                    'bg-gradient-to-br from-neo-yellow via-yellow-400 to-amber-500',
                    'text-neo-black shadow-[0_0_12px_rgba(255,225,53,0.6)]',
                    'border-amber-600/60',
                  ],

                  // Ice tile - blue frost
                  tile.type === 'ice' && [
                    'bg-gradient-to-br from-cyan-200 via-blue-300 to-cyan-400',
                    'text-blue-900',
                    'border-cyan-500/60',
                  ],

                  // Bomb tile - danger red
                  tile.type === 'bomb' && [
                    'bg-gradient-to-br from-red-500 via-red-600 to-orange-600',
                    'text-neo-white',
                    'border-red-700/60',
                  ],

                  // Rainbow tile - multi-color
                  tile.type === 'rainbow' && [
                    'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500',
                    'text-neo-black',
                    'border-purple-500/60',
                  ],

                  // Interactive state
                  canInteract && 'hover:scale-105 active:scale-95'
                )}
              >
                {/* Letter */}
                <span className="relative z-10 select-none">{tile.letter}</span>

                {/* Gold badge */}
                {tile.type === 'gold' && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 z-20',
                      'min-w-[18px] h-[18px]',
                      'flex items-center justify-center',
                      'bg-neo-black text-neo-yellow',
                      'text-[10px] font-black',
                      'rounded-full border-2 border-neo-yellow'
                    )}
                  >
                    3x
                  </span>
                )}

                {/* Rainbow wildcard badge */}
                {tile.type === 'rainbow' && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 z-20',
                      'min-w-[18px] h-[18px]',
                      'flex items-center justify-center',
                      'bg-neo-black text-neo-white',
                      'text-[12px] font-black',
                      'rounded-full border-2 border-purple-500'
                    )}
                  >
                    *
                  </span>
                )}

                {/* Frost overlay for frozen ice tiles */}
                {tile.type === 'ice' && tile.isFrozen && (
                  <div
                    className={cn(
                      'frost-overlay absolute inset-0 rounded-neo',
                      'bg-gradient-to-br from-white/40 via-cyan-100/30 to-blue-200/40',
                      'backdrop-blur-[1px]',
                      'pointer-events-none'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

AdventureGrid.displayName = 'AdventureGrid';

export default AdventureGrid;
