/**
 * AdventureGrid Component
 *
 * Adventure mode grid wrapper that renders special tiles (gold, ice, bomb, rainbow)
 * and handles tile selection for word formation.
 */

'use client';

import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import type { GridTileState } from '@/types/adventure';
import { useLanguage } from '@/contexts/LanguageContext';
import { WordPathTrail, SelectionSparkle } from '@/components/animations';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useCascadeAnimation } from '@/hooks/useCascadeAnimation';
import BoardFrame from '@/components/adventure/themed/BoardFrame';
import { AdventureThemeContext } from '@/contexts/AdventureThemeContext';
import { AdventureTile } from './AdventureTile';
import './AdventureTile.css';
import { useGridGestures } from './useGridGestures';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';
import { useBossGridEffect } from '@/hooks/useBossGridEffect';
import './BossGridEffectStyles.css';

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
  /** Boss grid effect (CSS-driven visual disruption) */
  bossGridEffect?: { name: string; id: number } | null;
  /** Indices of tiles adjacent to the last selected tile (for selection hints) */
  adjacentIndices?: number[];
  /** Indices of tiles locked by boss abilities (prevents selection) */
  lockedTileIndices?: number[];
}

// ==============================================
// CONSTANTS
// ==============================================


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
        bossGridEffect,
        adjacentIndices = [],
        lockedTileIndices = [],
      },
      ref
    ) => {
      const { t } = useLanguage();

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

      // Boss grid effect (CSS-driven, no per-tile state)
      const { gridClass: bossGridClass } = useBossGridEffect(bossGridEffect ?? null, prefersReducedMotion);

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
        handleMouseUp: handleMouseUpFromHook,
      } = useGridGestures({
        gridRef,
        gridSize,
        tiles,
        interactive: interactive ?? true,
        disabled: disabled ?? false,
        selectedIndices,
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

    // Build adjacent tile set for selection hints (classic grid behavior)
    const adjacentSet = useMemo(
      () => new Set(adjacentIndices),
      [adjacentIndices]
    );

    // Build locked tile set for boss abilities
    const lockedSet = useMemo(
      () => new Set(lockedTileIndices),
      [lockedTileIndices]
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
    // Word submission is handled by onDragEnd (via gridInteraction.handleDragEnd)
    // which is called inside handleMouseUpFromHook → useGridGestures.handleDragEnd.
    // No secondary submission needed here — it caused double-submit races.
    const handleMouseUp = useCallback(() => {
      handleMouseUpFromHook();
    }, [handleMouseUpFromHook]);

    // Prevent ghost mouseup from touch events
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      e.preventDefault(); // Suppress synthetic mouseup
      handleMouseUp();
    }, [handleMouseUp]);

    // Get aria-label for tile (translated)
    const getTileAriaLabel = useCallback((tile: GridTileState): string => {
      const baseLabel = `${t('adventure.tiles.letter')} ${tile.letter}`;
      if (tile.type === 'standard') return baseLabel;
      const typeLabel = t(`adventure.tiles.aria.${tile.type}`);
      return typeLabel ? `${baseLabel}, ${typeLabel}` : baseLabel;
    }, [t]);

    return (
      <div className={cn('flex flex-col', showWordPreview && 'gap-2', className)}>
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
        <BoardFrame className="flex-1 flex flex-col">
          <div
          ref={containerRef}
          dir="ltr"
          role="grid"
          aria-label={t('adventure.game.gridAriaLabel')}
          onMouseUp={interactive ? handleMouseUp : undefined}
          /* touchmove registered as native non-passive listener in useGridGestures */
          onTouchEnd={interactive ? handleTouchEnd : undefined}
          data-boss-effect={bossGridEffect?.name ?? undefined}
          style={{
            padding: GRID_PADDING,
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
            containerType: 'size' as const,
            ['--cell-font-size' as string]: `calc((100cqw / ${gridSize}) * 0.50)`,
          }}
          className={cn(
            'adventure-grid',
            'relative grid flex-1',
            GRID_GAP_CLASS,
            // Board visual treatment: dark inset background, neo-brutalist border, rounded container
            'bg-black/30 rounded-neo-lg',
            'border-2 border-black/50',
            'shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]',
            'select-none touch-none',
            disabled && 'adventure-grid-disabled pointer-events-none',
            bossGridClass,
          )}
        >
          <AdaptiveAnimatePresence mode={enableComplexAnimations ? 'popLayout' : 'sync'}>
          {tiles.map((tile, index) => {
            const isSelected = selectedSet.has(index);
            const isHintHighlighted = hintSet.has(index);
            const isAdjacentHint = adjacentSet.has(index);
            const isLocked = lockedSet.has(index);
            const canInteract = interactive && !disabled && !tile.isCleared && !isLocked;

            // Chain cascade delay for chained tiles (takes priority over tile.cascadeDelay)
            const chainCascadeDelay = tile.isChained ? chainCascade.delays.get(index) : undefined;

            return (
              <AdventureTile
                key={tile.id}
                tile={tile}
                index={index}
                isSelected={isSelected}
                isHintHighlighted={isHintHighlighted}
                isAdjacentHint={isAdjacentHint}
                canInteract={canInteract}
                worldId={worldId}
                bombRowPreview={bombRowPreview}
                showCascade={showCascade}
                cascadeComplete={cascadeComplete}
                getCascadeDelay={getCascadeDelay}
                prefersReducedMotion={prefersReducedMotion}
                enableComplexAnimations={enableComplexAnimations}
                onTileClick={handleTileClick}
                onTileDragStart={handleDragStart}
                onTileDragEnter={handleDragEnter}
                getTileAriaLabel={getTileAriaLabel}
                chainCascadeDelay={chainCascadeDelay}
                isLocked={isLocked}
              />
            );
          })}
          </AdaptiveAnimatePresence>

          {/* Word Path Trail - z-20 to render above tiles (which have z-10 when selected) */}
          {enableComplexAnimations && pathPoints && pathPoints.length >= 2 && (
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

          {/* Selection Sparkle Effect - skip on low-end */}
          {enableComplexAnimations && (
            <SelectionSparkle
              position={sparkleState.position}
              triggerKey={sparkleState.key}
              colorScheme="valid"
              particleCount={6}
              spreadRadius={30}
              useSquareParticles
            />
          )}
          </div>
        </BoardFrame>
      </div>
    );
    }
  )
);

AdventureGrid.displayName = 'AdventureGrid';

export default AdventureGrid;
