/**
 * AdventureGrid Component
 *
 * Adventure mode grid wrapper that renders special tiles (gold, ice, bomb, rainbow)
 * and handles tile selection for word formation.
 */

'use client';

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GridTileState, TileType } from '@/types/adventure';
import { WordPathTrail, SelectionSparkle } from '@/components/animations';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

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
  /** Callback when drag selection starts */
  onDragStart?: (index: number, tile: GridTileState) => void;
  /** Callback when drag enters a new tile */
  onDragEnter?: (index: number, tile: GridTileState) => void;
  /** Callback when drag selection ends */
  onDragEnd?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Path points for trail animation */
  pathPoints?: Array<{ x: number; y: number; timestamp: number }>;
  /** Whether current word is valid */
  isWordValid?: boolean;
  /** Whether word was just submitted */
  wasWordSubmitted?: boolean;
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
  chain: 'tile-chain',
  time: 'tile-time',
};

const TILE_TYPE_LABELS: Record<TileType, string> = {
  standard: '',
  gold: 'gold tile (3x multiplier)',
  ice: 'ice tile (obstacle)',
  bomb: 'bomb tile (clears row)',
  rainbow: 'rainbow tile (wildcard)',
  chain: 'chain tile (link bonus)',
  time: 'time tile (+5 seconds)',
};

const GRID_COLS_CLASSES: Record<number, string> = {
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

// ==============================================
// COMPONENT
// ==============================================

const AdventureGrid = memo(
  React.forwardRef<HTMLDivElement, AdventureGridProps>(
    (
      {
        tiles,
        gridSize,
        selectedIndices = [],
        interactive = false,
        disabled = false,
        showWordPreview = false,
        onTileSelect,
        onWordSubmit,
        onDragStart,
        onDragEnter,
        onDragEnd,
        className,
        pathPoints,
        isWordValid = false,
        wasWordSubmitted = false,
      },
      ref
    ) => {
      // Track whether we're currently dragging
      const isDraggingRef = useRef(false);
      // Track last tile index for touch move to prevent duplicate calls
      const lastTouchTileIndexRef = useRef<number | null>(null);
      // Ref to grid container for touch event handling
      const gridRef = useRef<HTMLDivElement>(null);

      // Merge refs (internal and forwarded)
      React.useImperativeHandle(ref, () => gridRef.current!);

      // Use gridRef consistently
      const containerRef = gridRef;

      // Device performance detection for adaptive animations
      const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

      // Sparkle state for selection feedback
      const [sparkleState, setSparkleState] = useState<{
        position: { x: number; y: number } | null;
        key: number;
      }>({ position: null, key: 0 });

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

    // Handle drag start (mouse down / touch start on tile)
    const handleDragStart = useCallback(
      (e: React.MouseEvent | React.TouchEvent, index: number, tile: GridTileState) => {
        if (disabled || tile.isCleared || !interactive) return;
        isDraggingRef.current = true;
        lastTouchTileIndexRef.current = index;

        // Trigger sparkle at click/touch position
        if (enableComplexAnimations) {
          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
          setSparkleState({
            position: { x: clientX, y: clientY },
            key: Date.now(),
          });
        }

        if (onDragStart) {
          onDragStart(index, tile);
        }
      },
      [disabled, interactive, onDragStart, enableComplexAnimations]
    );

    // Handle drag enter (mouse enters tile during drag)
    const handleDragEnter = useCallback(
      (index: number, tile: GridTileState) => {
        if (disabled || tile.isCleared || !interactive) return;
        if (isDraggingRef.current && onDragEnter) {
          onDragEnter(index, tile);
        }
      },
      [disabled, interactive, onDragEnter]
    );

    // Handle drag end (mouse up)
    const handleDragEnd = useCallback(() => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        lastTouchTileIndexRef.current = null;
        if (onDragEnd) {
          onDragEnd();
        }
      }
    }, [onDragEnd]);

    // Handle touch move - find element under touch and trigger drag enter
    const handleTouchMove = useCallback(
      (e: React.TouchEvent) => {
        if (!isDraggingRef.current || disabled || !interactive) return;

        const touch = e.touches[0];
        if (!touch) return;

        // Find element under touch point
        const elementUnderTouch = document.elementFromPoint(
          touch.clientX,
          touch.clientY
        );

        if (!elementUnderTouch) return;

        // Find the gridcell parent (tile element)
        const tileElement = elementUnderTouch.closest('[role="gridcell"]');
        if (!tileElement) return;

        // Get the tile index from data attribute or find it in the grid
        const allTiles = containerRef.current?.querySelectorAll('[role="gridcell"]');
        if (!allTiles) return;

        const tileIndex = Array.from(allTiles).indexOf(tileElement);
        if (tileIndex === -1) return;

        // Skip if same tile as last touch
        if (tileIndex === lastTouchTileIndexRef.current) return;
        lastTouchTileIndexRef.current = tileIndex;

        const tile = tiles[tileIndex];
        if (!tile || tile.isCleared) return;

        // Trigger drag enter
        if (onDragEnter) {
          onDragEnter(tileIndex, tile);
        }
      },
      [disabled, interactive, tiles, onDragEnter]
    );

    // Handle word submission (on mouse/touch up)
    const handleMouseUp = useCallback(() => {
      // Call drag end first
      handleDragEnd();

      if (disabled || selectedIndices.length === 0) return;
      if (onWordSubmit) {
        onWordSubmit(formedWord, selectedIndices);
      }
    }, [disabled, selectedIndices, formedWord, onWordSubmit, handleDragEnd]);

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
          ref={containerRef}
          role="grid"
          aria-label="Adventure game board"
          onMouseUp={interactive ? handleMouseUp : undefined}
          onTouchMove={interactive ? handleTouchMove : undefined}
          onTouchEnd={interactive ? handleMouseUp : undefined}
          className={cn(
            'adventure-grid',
            'relative grid gap-1 p-2',
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
              <motion.div
                key={tile.id}
                data-row={tile.row}
                data-col={tile.col}
                role="gridcell"
                aria-label={getTileAriaLabel(tile)}
                aria-selected={isSelected}
                onClick={() => handleTileClick(index, tile)}
                onMouseDown={(e) => handleDragStart(e, index, tile)}
                onMouseEnter={() => handleDragEnter(index, tile)}
                onTouchStart={(e) => handleDragStart(e, index, tile)}
                animate={
                  prefersReducedMotion
                    ? { scale: isSelected ? 1.1 : 1, y: 0, rotate: 0 }
                    : {
                        scale: isSelected ? 1.1 : 1,
                        y: isSelected ? -2 : 0,
                        rotate: isSelected ? [0, -2, 2, 0] : 0,
                      }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                        mass: 0.5,
                        rotate: { duration: 0.3 },
                      }
                }
                whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
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

                  // Type-specific classes
                  TILE_TYPE_CLASSES[tile.type],

                  // State classes
                  tile.isCleared && 'tile-cleared opacity-40 cursor-not-allowed',
                  isSelected && 'tile-selected ring-2 ring-neo-cyan z-10',
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

                  // Chain tile - purple link
                  tile.type === 'chain' && [
                    'bg-gradient-to-br from-purple-400 via-violet-500 to-violet-600',
                    'text-neo-white shadow-[0_0_10px_rgba(138,43,226,0.5)]',
                    'border-purple-700/60',
                  ],

                  // Time tile - emerald clock
                  tile.type === 'time' && [
                    'bg-gradient-to-br from-emerald-400 via-teal-500 to-teal-600',
                    'text-neo-white shadow-[0_0_10px_rgba(16,185,129,0.5)]',
                    'border-emerald-600/60',
                  ]
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

                {/* Chain link badge */}
                {tile.type === 'chain' && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 z-20',
                      'min-w-[18px] h-[18px]',
                      'flex items-center justify-center',
                      'bg-neo-black text-purple-400',
                      'text-[10px] font-black',
                      'rounded-full border-2 border-purple-500'
                    )}
                  >
                    🔗
                  </span>
                )}

                {/* Time bonus badge */}
                {tile.type === 'time' && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 z-20',
                      'min-w-[18px] h-[18px]',
                      'flex items-center justify-center',
                      'bg-neo-black text-emerald-400',
                      'text-[9px] font-black',
                      'rounded-full border-2 border-emerald-500'
                    )}
                  >
                    +5s
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
              </motion.div>
            );
          })}

          {/* Word Path Trail */}
          {pathPoints && pathPoints.length >= 2 && (
            <div className="absolute inset-0 pointer-events-none" data-testid="word-path-trail">
              <WordPathTrail
                points={pathPoints}
                isValid={isWordValid}
                wasSubmitted={wasWordSubmitted}
                showParticles
                showGlow
              />
            </div>
          )}

          {/* Selection Sparkle Effect */}
          <SelectionSparkle
            position={sparkleState.position}
            triggerKey={sparkleState.key}
            colorScheme="valid"
            particleCount={6}
            spreadRadius={30}
            useSquareParticles
          />
        </div>
      </div>
    );
    }
  )
);

AdventureGrid.displayName = 'AdventureGrid';

export default AdventureGrid;
