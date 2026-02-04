/**
 * AdventureGrid Component
 *
 * Adventure mode grid wrapper that renders special tiles (gold, ice, bomb, rainbow)
 * and handles tile selection for word formation.
 */

'use client';

import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GridTileState, TileType, TileActivationEffect } from '@/types/adventure';
import { WordPathTrail, SelectionSparkle } from '@/components/animations';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useCascadeAnimation } from '@/hooks/useCascadeAnimation';
import BoardFrame from '@/components/adventure/themed/BoardFrame';
import { AdventureThemeContext } from '@/contexts/AdventureThemeContext';
import { AdventureTile } from './AdventureTile';
import './AdventureTile.css';
import { useGridGestures } from './useGridGestures';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

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
  /** Whether cascade animation should play on mount */
  showCascade?: boolean;
  /** Callback when cascade animation completes */
  onCascadeComplete?: () => void;
  /** Indices of tiles to highlight as hint */
  hintHighlightIndices?: number[];
}

// ==============================================
// CONSTANTS
// ==============================================

const TILE_TYPE_LABELS: Record<TileType, string> = {
  standard: '',
  gold: 'gold tile (3x multiplier)',
  ice: 'ice tile (obstacle)',
  bomb: 'bomb tile (clears row)',
  rainbow: 'rainbow tile (wildcard)',
  chain: 'chain tile (link bonus)',
  time: 'time tile (+5 seconds)',
  locked: 'locked tile (unlock with matching letter)',
  multiplier: 'multiplier tile (2x score)',
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
        showCascade = false,
        onCascadeComplete,
        hintHighlightIndices = [],
      },
      ref
    ) => {
      // Ref to grid container for touch event handling
      const gridRef = useRef<HTMLDivElement>(null);

      // Cascade animation state
      const [cascadeComplete, setCascadeComplete] = useState(!showCascade);

      // Ref for cascade callback to avoid effect re-runs when callback reference changes
      const onCascadeCompleteRef = useRef(onCascadeComplete);
      useEffect(() => {
        onCascadeCompleteRef.current = onCascadeComplete;
      }, [onCascadeComplete]);

      // World theming - default to world 1 if theme context is not available
      // This allows AdventureGrid to work both inside and outside AdventureThemeProvider
      // Always call useContext unconditionally (Rules of Hooks), then check if value is null
      const adventureTheme = React.useContext(AdventureThemeContext);
      const worldId = adventureTheme?.worldId || 1;

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

      // Chain cascade animation for chain tile reactions
      const chainCascade = useCascadeAnimation();

      // Wrap drag start callback to add sparkle effect
      const handleDragStartWithSparkle = useCallback(
        (index: number, tile: GridTileState) => {
          // Note: We can't add sparkle here because we don't have the event
          // Sparkle logic has been moved to the wrapper below
          if (onDragStart) {
            onDragStart(index, tile);
          }
        },
        [onDragStart]
      );

      // Grid gesture handling hook (with wrapped callback)
      const {
        handleTileClick: handleTileClickFromHook,
        handleDragStart: handleDragStartBase,
        handleDragEnter,
        handleDragEnd,
        handleTouchMove,
        handleMouseUp: handleMouseUpFromHook,
      } = useGridGestures({
        gridRef,
        gridSize,
        tiles,
        interactive: interactive ?? true,
        disabled: disabled ?? false,
        onTileSelect,
        onDragStart: handleDragStartWithSparkle,
        onDragEnter,
        onDragEnd,
      });

      // Wrap drag start handler to add sparkle effect AFTER validation checks
      const handleDragStart = useCallback(
        (e: React.MouseEvent | React.TouchEvent, index: number, tile: GridTileState) => {
          // Only add sparkle if drag will actually start (checked by hook)
          if (!disabled && !tile.isCleared && interactive && enableComplexAnimations) {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            setSparkleState({
              position: { x: clientX, y: clientY },
              key: Date.now(),
            });
          }

          // Call hook's drag start handler (which does full validation)
          handleDragStartBase(e, index, tile);
        },
        [disabled, interactive, enableComplexAnimations, handleDragStartBase]
      );

    // Calculate cascade delay per tile (diagonal wave pattern)
    // DEBT-01: Optimized from 30ms to 25ms stagger for faster entry
    const getCascadeDelay = useCallback((row: number, col: number): number => {
      return OPTIMIZED_TIMING.getCascadeDelay(row, col);
    }, []);

    // Cascade completion effect
    // Uses ref for callback to prevent effect re-running when parent re-renders
    // DEBT-01: Uses optimized timing constants for faster entry sequence
    useEffect(() => {
      if (!showCascade || cascadeComplete) return;

      // Calculate total cascade duration using optimized constants
      const totalDuration = OPTIMIZED_TIMING.getCascadeDuration(gridSize);

      const timer = setTimeout(() => {
        setCascadeComplete(true);
        onCascadeCompleteRef.current?.();
      }, totalDuration);

      return () => clearTimeout(timer);
    }, [showCascade, cascadeComplete, gridSize]);

    // Instant completion for reduced motion
    useEffect(() => {
      if (showCascade && prefersReducedMotion && !cascadeComplete) {
        setCascadeComplete(true);
        onCascadeCompleteRef.current?.();
      }
    }, [showCascade, prefersReducedMotion, cascadeComplete]);

    // Detect chain tile activation and trigger cascade
    useEffect(() => {
      // Find chain tile with 'link' activation effect
      const chainTile = tiles.find(
        (tile) => tile.type === 'chain' && tile.activationEffect === 'link' && tile.activationTimestamp
      );

      if (!chainTile) return;

      // Find all tiles marked as chained
      const chainedIndices = tiles
        .map((tile, idx) => (tile.isChained ? idx : -1))
        .filter((idx) => idx !== -1);

      if (chainedIndices.length === 0) return;

      // Trigger cascade animation from chain tile position
      chainCascade.startCascade({
        origin: { row: chainTile.row, col: chainTile.col },
        affectedIndices: chainedIndices,
        gridSize,
        staggerMs: 50, // Slower than regular cascade (30ms) for emphasis
        animationType: 'wave',
      });
    }, [tiles, gridSize, chainCascade]);

    // Build selected set for quick lookup
    const selectedSet = useMemo(
      () => new Set(selectedIndices),
      [selectedIndices]
    );

    // Build hint highlight set for quick lookup
    const hintSet = useMemo(
      () => new Set(hintHighlightIndices),
      [hintHighlightIndices]
    );

    // Detect if a bomb tile is selected and get its row for preview highlighting
    const bombRowPreview = useMemo(() => {
      for (const idx of selectedIndices) {
        const tile = tiles[idx];
        if (tile?.type === 'bomb') {
          return tile.row;
        }
      }
      return null;
    }, [selectedIndices, tiles]);

    // Build formed word from selected tiles
    const formedWord = useMemo(() => {
      return selectedIndices.map((idx) => tiles[idx]?.letter || '').join('');
    }, [selectedIndices, tiles]);

    // Handle tile click (use hook's version directly)
    const handleTileClick = handleTileClickFromHook;

    // Handle word submission (on mouse/touch up)
    const handleMouseUp = useCallback(() => {
      // Call drag end first
      handleMouseUpFromHook();

      if (disabled || selectedIndices.length === 0) return;
      if (onWordSubmit) {
        onWordSubmit(formedWord, selectedIndices);
      }
    }, [disabled, selectedIndices, formedWord, onWordSubmit, handleMouseUpFromHook]);

    // Get aria-label for tile
    const getTileAriaLabel = useCallback((tile: GridTileState): string => {
      const baseLabel = `Letter ${tile.letter}`;
      const typeLabel = TILE_TYPE_LABELS[tile.type];
      return typeLabel ? `${baseLabel}, ${typeLabel}` : baseLabel;
    }, []);

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Word Preview - Always reserve space to prevent layout shift */}
        {showWordPreview && (
          <div
            data-testid="word-preview-container"
            className="min-h-[44px] flex items-center justify-center"
          >
            {formedWord.length > 0 ? (
              <div
                className={cn(
                  'text-center text-2xl font-black text-neo-white',
                  'bg-neo-navy/60 rounded-neo px-4 py-2'
                )}
              >
                {formedWord}
              </div>
            ) : (
              /* Invisible placeholder to reserve space */
              <div
                data-testid="word-preview-placeholder"
                className="invisible text-2xl font-black px-4 py-2"
                aria-hidden="true"
              >
                &nbsp;
              </div>
            )}
          </div>
        )}

        {/* Grid with world-themed board frame */}
        <BoardFrame>
          <div
          ref={containerRef}
          dir="ltr"
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
          <AnimatePresence mode="popLayout">
          {tiles.map((tile, index) => {
            const isSelected = selectedSet.has(index);
            const isHintHighlighted = hintSet.has(index);
            const canInteract = interactive && !disabled && !tile.isCleared;

            // Chain cascade delay for chained tiles (takes priority over tile.cascadeDelay)
            const chainCascadeDelay = tile.isChained ? chainCascade.delays.get(index) : undefined;

            return (
              <AdventureTile
                key={tile.id}
                tile={tile}
                index={index}
                isSelected={isSelected}
                isHintHighlighted={isHintHighlighted}
                canInteract={canInteract}
                worldId={worldId}
                bombRowPreview={bombRowPreview}
                showCascade={showCascade}
                cascadeComplete={cascadeComplete}
                getCascadeDelay={getCascadeDelay}
                prefersReducedMotion={prefersReducedMotion}
                enableComplexAnimations={enableComplexAnimations}
                onClick={() => handleTileClick(index, tile)}
                onMouseDown={(e) => handleDragStart(e, index, tile)}
                onMouseEnter={() => handleDragEnter(index, tile)}
                onTouchStart={(e) => handleDragStart(e, index, tile)}
                getTileAriaLabel={getTileAriaLabel}
                chainCascadeDelay={chainCascadeDelay}
              />
            );
          })}
          </AnimatePresence>

          {/* Word Path Trail - z-20 to render above tiles (which have z-10 when selected) */}
          {pathPoints && pathPoints.length >= 2 && (
            <div className="absolute inset-0 pointer-events-none z-20" data-testid="word-path-trail">
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
        </BoardFrame>
      </div>
    );
    }
  )
);

AdventureGrid.displayName = 'AdventureGrid';

export default AdventureGrid;
