/**
 * AdventureGrid Component
 *
 * Adventure mode grid wrapper that renders special tiles (gold, ice, bomb, rainbow)
 * and handles tile selection for word formation.
 */

'use client';

import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Link2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GridTileState, TileType, TileActivationEffect } from '@/types/adventure';
import { WordPathTrail, SelectionSparkle } from '@/components/animations';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useCascadeAnimation } from '@/hooks/useCascadeAnimation';
import BoardFrame from '@/components/adventure/themed/BoardFrame';
import { AdventureThemeContext } from '@/contexts/AdventureThemeContext';
import './AdventureTile.css';
import {
  type GridMeasurements,
  measureAdventureGrid,
  getCellAtPosition,
  getTileIndex,
  isWithinSelectionThreshold,
  isDiagonalMove,
  hasExceededDeadzone,
} from './adventureGridGeometry';
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

const TILE_TYPE_CLASSES: Record<TileType, string> = {
  standard: '',
  gold: 'tile-gold',
  ice: 'tile-ice',
  bomb: 'tile-bomb',
  rainbow: 'tile-rainbow',
  chain: 'tile-chain',
  time: 'tile-time',
  locked: 'tile-locked',
  multiplier: 'tile-multiplier',
};

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

// World-specific theming classes
const TEXTURE_CLASSES: Record<number, string> = {
  1: 'tile-texture-meadows',
  2: 'tile-texture-springs',
  3: 'tile-texture-caverns',
};

const BORDER_CLASSES: Record<number, string> = {
  1: 'tile-border-meadows',
  2: 'tile-border-springs',
  3: 'tile-border-caverns',
};

const LETTER_GLOW_CLASSES: Record<number, string> = {
  1: 'letter-glow-meadows',
  2: 'letter-glow-springs',
  3: 'letter-glow-caverns',
};

// Tile types that should NOT receive texture/border theming
const SPECIAL_TILE_TYPES: Set<TileType> = new Set([
  'gold',
  'ice',
  'bomb',
  'rainbow',
  'chain',
  'time',
]);

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
      // Track whether we're currently dragging
      const isDraggingRef = useRef(false);
      // Track last tile index for touch move to prevent duplicate calls
      const lastTouchTileIndexRef = useRef<number | null>(null);
      // Ref to grid container for touch event handling
      const gridRef = useRef<HTMLDivElement>(null);
      // Track whether deadzone has been exceeded
      const hasExceededDeadzoneRef = useRef(false);
      // Track start position for deadzone calculation
      const startPosRef = useRef<{ x: number; y: number } | null>(null);
      // Cache grid measurements to avoid layout thrashing
      const gridMeasurementsRef = useRef<GridMeasurements | null>(null);

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

    // Get cached or fresh grid measurements
    const getGridMeasurements = useCallback((): GridMeasurements | null => {
      if (!containerRef.current) return null;

      const now = performance.now();
      // Cache measurements for 100ms to avoid layout thrashing
      if (gridMeasurementsRef.current && now - gridMeasurementsRef.current.timestamp < 100) {
        return gridMeasurementsRef.current;
      }

      const measurements = measureAdventureGrid(containerRef.current, gridSize);
      if (measurements) {
        gridMeasurementsRef.current = measurements;
      }
      return measurements;
    }, [gridSize, containerRef]);

    // Handle drag start (mouse down / touch start on tile)
    const handleDragStart = useCallback(
      (e: React.MouseEvent | React.TouchEvent, index: number, tile: GridTileState) => {
        if (disabled || tile.isCleared || !interactive) return;
        isDraggingRef.current = true;
        lastTouchTileIndexRef.current = index;
        hasExceededDeadzoneRef.current = false;

        // Store start position for deadzone calculation
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosRef.current = { x: clientX, y: clientY };

        // Cache grid measurements at start of drag
        getGridMeasurements();

        // Trigger sparkle at click/touch position
        if (enableComplexAnimations) {
          setSparkleState({
            position: { x: clientX, y: clientY },
            key: Date.now(),
          });
        }

        if (onDragStart) {
          onDragStart(index, tile);
        }
      },
      [disabled, interactive, onDragStart, enableComplexAnimations, getGridMeasurements]
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
        hasExceededDeadzoneRef.current = false;
        startPosRef.current = null;
        if (onDragEnd) {
          onDragEnd();
        }
      }
    }, [onDragEnd]);

    // Handle touch move - find element under touch and trigger drag enter
    // Uses selection threshold to prevent accidental over-selection
    const handleTouchMove = useCallback(
      (e: React.TouchEvent) => {
        if (!isDraggingRef.current || disabled || !interactive) return;

        const touch = e.touches[0];
        if (!touch) return;

        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // Check deadzone - must exceed threshold before selecting new cells
        if (!hasExceededDeadzoneRef.current && startPosRef.current) {
          if (!hasExceededDeadzone(startPosRef.current.x, startPosRef.current.y, touchX, touchY)) {
            return; // Still within deadzone, don't select
          }
          hasExceededDeadzoneRef.current = true;
        }

        // Get grid measurements for precise cell detection
        const measurements = getGridMeasurements();
        if (!measurements) {
          // Fallback to element-based detection if measurements unavailable
          const elementUnderTouch = document.elementFromPoint(touchX, touchY);
          if (!elementUnderTouch) return;

          const tileElement = elementUnderTouch.closest('[role="gridcell"]');
          if (!tileElement) return;

          const allTiles = containerRef.current?.querySelectorAll('[role="gridcell"]');
          if (!allTiles) return;

          const tileIndex = Array.from(allTiles).indexOf(tileElement);
          if (tileIndex === -1 || tileIndex === lastTouchTileIndexRef.current) return;

          const tile = tiles[tileIndex];
          if (!tile || tile.isCleared) return;

          lastTouchTileIndexRef.current = tileIndex;
          if (onDragEnter) onDragEnter(tileIndex, tile);
          return;
        }

        // Use precise cell detection with selection threshold
        const cellPosition = getCellAtPosition(touchX, touchY, tiles, gridSize, measurements);
        if (!cellPosition) return;

        const newTileIndex = getTileIndex(cellPosition.row, cellPosition.col, gridSize);

        // Skip if same tile as last touch
        if (newTileIndex === lastTouchTileIndexRef.current) return;

        // Get last selected tile for diagonal detection
        const lastIndex = lastTouchTileIndexRef.current;
        const lastTile = lastIndex !== null ? tiles[lastIndex] : null;

        // Check if movement is diagonal (more lenient threshold)
        const isDiagonal = lastTile
          ? isDiagonalMove(lastTile, { row: cellPosition.row, col: cellPosition.col })
          : false;

        // Apply selection threshold - must be close to cell center
        if (!isWithinSelectionThreshold(cellPosition, isDiagonal)) {
          return; // Touch too far from cell center, don't select
        }

        lastTouchTileIndexRef.current = newTileIndex;

        const tile = tiles[newTileIndex];
        if (!tile || tile.isCleared) return;

        // Trigger drag enter
        if (onDragEnter) {
          onDragEnter(newTileIndex, tile);
        }
      },
      [disabled, interactive, tiles, gridSize, onDragEnter, containerRef, getGridMeasurements]
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

            // World-specific theming
            const isStandardTile = !SPECIAL_TILE_TYPES.has(tile.type);
            const textureClass = isStandardTile ? TEXTURE_CLASSES[worldId] : '';
            const borderClass = isStandardTile ? BORDER_CLASSES[worldId] : '';
            const letterGlowClass = LETTER_GLOW_CLASSES[worldId] || LETTER_GLOW_CLASSES[1];

            // Chain cascade delay for chained tiles (takes priority over tile.cascadeDelay)
            const chainCascadeDelay = tile.isChained ? chainCascade.delays.get(index) : undefined;
            const effectiveCascadeDelay = chainCascadeDelay ?? tile.cascadeDelay;

            return (
              <motion.div
                key={tile.id}
                layoutId={tile.id}
                data-row={tile.row}
                data-col={tile.col}
                role="gridcell"
                aria-label={getTileAriaLabel(tile)}
                aria-selected={isSelected}
                onClick={() => handleTileClick(index, tile)}
                onMouseDown={(e) => handleDragStart(e, index, tile)}
                onMouseEnter={() => handleDragEnter(index, tile)}
                onTouchStart={(e) => handleDragStart(e, index, tile)}
                initial={showCascade && !cascadeComplete ? {
                  y: -100,
                  opacity: 0,
                  scale: 0.8,
                } : undefined}
                animate={{
                  y: isSelected ? -4 : 0,
                  opacity: 1,
                  scale: isSelected ? 1.15 : 1,
                  rotate: isSelected && !prefersReducedMotion ? [0, -2, 2, 0] : 0,
                }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : showCascade && !cascadeComplete
                      ? {
                          // DEBT-01: Optimized spring config for faster settle
                          type: 'spring',
                          stiffness: OPTIMIZED_TIMING.cascade.spring.stiffness,
                          damping: OPTIMIZED_TIMING.cascade.spring.damping,
                          mass: OPTIMIZED_TIMING.cascade.spring.mass,
                          delay: getCascadeDelay(tile.row, tile.col) / 1000,
                        }
                      : {
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                          mass: 0.5,
                        }
                }
                whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
                style={{
                  animationDelay: effectiveCascadeDelay
                    ? `${effectiveCascadeDelay}ms`
                    : undefined,
                }}
                className={cn(
                  // Base tile styles
                  'relative aspect-square flex items-center justify-center',
                  'font-black text-xl cursor-pointer',
                  'border-2 border-neo-black/30 rounded-neo',

                  // World-specific theming
                  textureClass,
                  borderClass,

                  // Type-specific classes
                  TILE_TYPE_CLASSES[tile.type],

                  // Enhanced effect classes for special tiles
                  enableComplexAnimations && tile.type === 'gold' && 'tile-gold-enhanced',
                  enableComplexAnimations && tile.type === 'ice' && !tile.isCleared && 'tile-ice-enhanced',
                  enableComplexAnimations && tile.type === 'bomb' && 'tile-bomb-enhanced',
                  enableComplexAnimations && tile.type === 'rainbow' && 'tile-rainbow-enhanced',
                  enableComplexAnimations && tile.type === 'chain' && 'tile-chain-enhanced',
                  enableComplexAnimations && tile.type === 'time' && 'tile-time-enhanced',

                  // Activation effect classes (one-time animation when tile effect triggers)
                  enableComplexAnimations && tile.activationEffect && `tile-effect-${tile.activationEffect}`,

                  // State classes
                  tile.isCleared && 'tile-cleared opacity-40 cursor-not-allowed',
                  // Enhanced selection: thick ring + outline + glow + pulsing animation
                  isSelected && [
                    'tile-selected-enhanced',
                    'ring-4 ring-neo-lime',
                    'outline outline-[3px] outline-neo-black',
                    'z-20',
                    'shadow-[0_0_24px_rgba(191,255,0,0.9),0_0_48px_rgba(191,255,0,0.5)]',
                  ],
                  tile.isFrozen && tile.type === 'ice' && 'tile-frozen',

                  // Bomb row preview: highlight tiles in bomb's row when bomb is selected
                  bombRowPreview !== null && tile.row === bombRowPreview && 'bomb-row-preview',

                  // Hint highlight: show which tiles form the hinted word
                  isHintHighlighted && !isSelected && [
                    'ring-2 ring-neo-yellow',
                    'shadow-[0_0_16px_rgba(255,225,53,0.7),0_0_32px_rgba(255,225,53,0.3)]',
                    'animate-pulse',
                  ],

                  // Standard tile background
                  tile.type === 'standard' &&
                    'bg-gradient-to-br from-neo-white via-gray-100 to-gray-200 text-neo-black overflow-hidden',

                  // Gold tile - golden glow
                  tile.type === 'gold' && [
                    'bg-gradient-to-br from-neo-yellow via-yellow-400 to-amber-500',
                    'text-neo-black',
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

                  // Rainbow tile - animated via CSS
                  tile.type === 'rainbow' && [
                    'text-neo-black',
                    'border-purple-500/60',
                  ],

                  // Chain tile - purple link
                  tile.type === 'chain' && [
                    'bg-gradient-to-br from-purple-400 via-violet-500 to-violet-600',
                    'text-neo-white',
                    'border-purple-700/60',
                  ],

                  // Time tile - emerald clock
                  tile.type === 'time' && [
                    'bg-gradient-to-br from-emerald-400 via-teal-500 to-teal-600',
                    'text-neo-white',
                    'border-emerald-600/60',
                  ]
                )}
              >
                {/* ========== GOLD TILE EFFECTS ========== */}
                {tile.type === 'gold' && enableComplexAnimations && (
                  <>
                    <div className="tile-gold-sparkle tile-gold-sparkle--1" />
                    <div className="tile-gold-sparkle tile-gold-sparkle--2" />
                    <div className="tile-gold-sparkle tile-gold-sparkle--3" />
                  </>
                )}

                {/* ========== ICE TILE EFFECTS ========== */}
                {/* Only show ice effects when tile is NOT cleared (melted) */}
                {tile.type === 'ice' && !tile.isCleared && enableComplexAnimations && (
                  <>
                    <span className="tile-ice-snowflake tile-ice-snowflake--1">❄</span>
                    <span className="tile-ice-snowflake tile-ice-snowflake--2">❄</span>
                    <span className="tile-ice-snowflake tile-ice-snowflake--3">❄</span>
                  </>
                )}

                {/* ========== BOMB TILE EFFECTS ========== */}
                {tile.type === 'bomb' && !tile.isCleared && enableComplexAnimations && (
                  <>
                    <div className="tile-bomb-rings">
                      <div className="tile-bomb-ring" />
                      <div className="tile-bomb-ring tile-bomb-ring--2" />
                      <div className="tile-bomb-ring tile-bomb-ring--3" />
                    </div>
                    <div className="tile-bomb-spark" />
                  </>
                )}

                {/* ========== RAINBOW TILE EFFECTS ========== */}
                {tile.type === 'rainbow' && enableComplexAnimations && (
                  <>
                    <div className="tile-rainbow-particle tile-rainbow-particle--1" />
                    <div className="tile-rainbow-particle tile-rainbow-particle--2" />
                    <div className="tile-rainbow-particle tile-rainbow-particle--3" />
                    <div className="tile-rainbow-star" />
                  </>
                )}

                {/* ========== CHAIN TILE EFFECTS ========== */}
                {tile.type === 'chain' && enableComplexAnimations && (
                  <>
                    <div className="tile-chain-line tile-chain-line--top" />
                    <div className="tile-chain-line tile-chain-line--bottom" />
                  </>
                )}

                {/* ========== TIME TILE EFFECTS ========== */}
                {tile.type === 'time' && enableComplexAnimations && (
                  <>
                    <div className="tile-time-hand" />
                    <div className="tile-time-particle tile-time-particle--1" />
                    <div className="tile-time-particle tile-time-particle--2" />
                    <div className="tile-time-particle tile-time-particle--3" />
                  </>
                )}

                {/* ========== ACTIVATION EFFECT PARTICLES ========== */}
                {/* Melt effect - water drops and splash */}
                {tile.activationEffect === 'melt' && enableComplexAnimations && (
                  <div className="tile-melt-splash" />
                )}

                {/* Explode effect - shockwaves and debris */}
                {tile.activationEffect === 'explode' && enableComplexAnimations && (
                  <>
                    <div className="tile-explode-shockwave" />
                    <div className="tile-explode-shockwave tile-explode-shockwave--2" />
                    <div className="tile-explode-shockwave tile-explode-shockwave--3" />
                    <div className="tile-explode-debris tile-explode-debris--1" />
                    <div className="tile-explode-debris tile-explode-debris--2" />
                    <div className="tile-explode-debris tile-explode-debris--3" />
                    <div className="tile-explode-debris tile-explode-debris--4" />
                    <div className="tile-explode-debris tile-explode-debris--5" />
                    <div className="tile-explode-debris tile-explode-debris--6" />
                  </>
                )}

                {/* Collect effect - coins and sparkle */}
                {tile.activationEffect === 'collect' && enableComplexAnimations && (
                  <>
                    <div className="tile-collect-sparkle" />
                    <div className="tile-collect-coin tile-collect-coin--1" />
                    <div className="tile-collect-coin tile-collect-coin--2" />
                    <div className="tile-collect-coin tile-collect-coin--3" />
                    <div className="tile-collect-coin tile-collect-coin--4" />
                  </>
                )}

                {/* Wildcard effect - rainbow rings and star */}
                {tile.activationEffect === 'wildcard' && enableComplexAnimations && (
                  <>
                    <div className="tile-wildcard-ring tile-wildcard-ring--1" />
                    <div className="tile-wildcard-ring tile-wildcard-ring--2" />
                    <div className="tile-wildcard-ring tile-wildcard-ring--3" />
                    <div className="tile-wildcard-star" />
                  </>
                )}

                {/* Link effect - pulse rings and icon */}
                {tile.activationEffect === 'link' && enableComplexAnimations && (
                  <>
                    <div className="tile-link-pulse" />
                    <div className="tile-link-pulse tile-link-pulse--2" />
                    <div className="tile-link-icon">🔗</div>
                  </>
                )}

                {/* Time bonus effect - floating +5s and clock */}
                {tile.activationEffect === 'timeBonus' && enableComplexAnimations && (
                  <>
                    <div className="tile-time-plus" />
                    <div className="tile-time-clock" />
                    <div className="tile-time-ring" />
                  </>
                )}

                {/* Letter */}
                <span className={cn(
                  'relative z-10 select-none',
                  letterGlowClass,
                  'drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]',
                  (tile.type === 'gold' || tile.type === 'rainbow') && 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                )}>
                  {tile.letter}
                </span>

                {/* Gold badge */}
                {tile.type === 'gold' && (
                  <span
                    className={cn(
                      'tile-gold-badge',
                      'absolute -top-1.5 -right-1.5 z-20',
                      'min-w-[20px] h-[20px]',
                      'flex items-center justify-center',
                      'bg-neo-black text-neo-yellow',
                      'text-[10px] font-black',
                      'rounded-full border-2 border-neo-yellow',
                      'shadow-[0_0_10px_rgba(255,225,53,0.7)]'
                    )}
                  >
                    3x
                  </span>
                )}

                {/* Rainbow wildcard badge */}
                {tile.type === 'rainbow' && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1.5 z-20',
                      'min-w-[20px] h-[20px]',
                      'flex items-center justify-center',
                      'bg-neo-black text-neo-white',
                      'text-[14px] font-black',
                      'rounded-full border-2 border-purple-400',
                      'shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                    )}
                  >
                    ✦
                  </span>
                )}

                {/* Bomb icon badge */}
                {tile.type === 'bomb' && (
                  <>
                    <div
                      className={cn(
                        'absolute -top-1 -right-1 z-20',
                        'w-5 h-5',
                        'flex items-center justify-center',
                        'bg-neo-black rounded-full',
                        'border-2 border-orange-500',
                        'shadow-[0_0_8px_rgba(255,100,0,0.6)]'
                      )}
                    >
                      <Bomb className="w-3 h-3 text-neo-yellow" />
                    </div>
                    {/* Row indicator - shows bomb clears entire row */}
                    <div className="tile-bomb-row-indicator">
                      <span />
                    </div>
                  </>
                )}

                {/* Chain link badge */}
                {tile.type === 'chain' && (
                  <div
                    className={cn(
                      'absolute -top-1 -right-1 z-20',
                      'w-5 h-5',
                      'flex items-center justify-center',
                      'bg-neo-black rounded-full',
                      'border-2 border-purple-400',
                      'shadow-[0_0_8px_rgba(138,43,226,0.6)]'
                    )}
                  >
                    <Link2 className="w-3 h-3 text-purple-400" />
                  </div>
                )}

                {/* Time bonus badge */}
                {tile.type === 'time' && (
                  <div
                    className={cn(
                      'absolute -top-1 -right-1 z-20',
                      'w-5 h-5',
                      'flex items-center justify-center',
                      'bg-neo-black rounded-full',
                      'border-2 border-emerald-400',
                      'shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                    )}
                  >
                    <Clock className="w-3 h-3 text-emerald-400" />
                  </div>
                )}

                {/* Frost overlay for frozen ice tiles */}
                {tile.type === 'ice' && tile.isFrozen && (
                  <div
                    className={cn(
                      'frost-overlay absolute inset-0 rounded-neo',
                      'bg-gradient-to-br from-white/50 via-cyan-100/40 to-blue-200/50',
                      'backdrop-blur-[2px]',
                      'pointer-events-none z-5'
                    )}
                  />
                )}
              </motion.div>
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
