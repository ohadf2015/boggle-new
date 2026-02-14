import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { LetterGrid, GridPosition, Language } from '@/types';

// Import extracted utilities
import {
  getComboColors,
  useGridInteraction,
  getPerformanceMode,
  ComboIndicator,
  ComboExplanationTooltip,
  type SelectedCell,
  type PerformanceMode,
} from './grid';
import { GRID_PADDING, GRID_GAP_CLASS } from './grid/gridLayoutConstants';
import { useDisableFireRoundLights, useDisableEarthquakeEffects, useLargeLetters } from '@/contexts/AccessibilityContext';
import { useDevicePerformance } from '../hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useEarthquakeAnimation } from '../hooks/useEarthquakeAnimation';

/** Cell position for highlighted paths */
export interface HighlightedCell {
  row: number;
  col: number;
}

interface GridComponentProps {
  grid: LetterGrid;
  interactive?: boolean;
  onWordSubmit?: (word: string) => void;
  /** Callback when word is submitted with its path - used for direction pattern detection */
  onPathSubmit?: (cells: SelectedCell[]) => void;
  selectedCells?: SelectedCell[];
  className?: string;
  largeText?: boolean;
  comboLevel?: number;
  animateOnMount?: boolean;
  fireRoundActive?: boolean;
  earthquakeShaking?: boolean;
  /** Callback when formed word changes - use for external word display */
  onWordChange?: (word: string, letterCount: number) => void;
  /** Hide the internal word preview (when using external WordFormingArea) */
  hideWordPreview?: boolean;
  /** Hide the internal combo indicator (when using external positioning) */
  hideComboIndicator?: boolean;
  /** External highlighted path for revealed words */
  highlightedPath?: HighlightedCell[];
  /** Letters that have been eliminated (not in target word) - shown dimmed on board */
  eliminatedLetters?: Set<string>;
  /** Callback when user taps a single cell without dragging (for tap-to-drag tutorial) */
  onSingleTapDetected?: (cell: { row: number; col: number; letter: string }) => void;
  /** Language for keyboard input validation */
  language?: Language;
  /** Disable grid's built-in letter key input - allows external keyboard input hook to handle typing */
  disableLetterKeyInput?: boolean;
  /** Callback when selected cells change - used by BlastGrid to sync selection state with overlay */
  onSelectionChange?: (cells: SelectedCell[]) => void;
}

/**
 * GridComponent - Interactive letter grid for word game
 * Memoized to prevent unnecessary re-renders
 *
 * REFACTORED: Core logic extracted to components/grid/:
 * - comboColors.ts - Combo level color schemes
 * - useGridInteraction.ts - Touch/mouse interaction logic
 * - performanceUtils.ts - Device capability detection
 *
 * VERSION: 2025-01-01-FIXED - effectiveRenderMode TDZ fix
 */

// Rainbow colors for dance floor effect - Soft pastels for gentle party atmosphere
// Moved outside component to be a stable reference for useEffect dependencies
const RAINBOW_COLORS = [
  '#FFB3D9', // Soft pink
  '#FFB380', // Peachy orange
  '#FFE680', // Gentle yellow
  '#B3FFB3', // Mint green
  '#B3E5FF', // Sky blue
  '#D9B3FF', // Lavender
  '#FFD1DC', // Rose
];

const GridComponent = memo<GridComponentProps>(({
  grid,
  interactive = false,
  onWordSubmit,
  onPathSubmit,
  selectedCells: externalSelectedCells,
  className,
  largeText = false,
  comboLevel = 0,
  animateOnMount = false,
  fireRoundActive = false,
  earthquakeShaking = false,
  onWordChange,
  hideWordPreview = false,
  hideComboIndicator = false,
  highlightedPath = [],
  eliminatedLetters,
  onSingleTapDetected,
  language = 'en',
  disableLetterKeyInput = false,
  onSelectionChange,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('full');
  const gridRef = useRef<HTMLDivElement>(null);

  // Hint animation state: 'blink' -> 'fadeout' -> null
  const [hintAnimationPhase, setHintAnimationPhase] = useState<'blink' | 'fadeout' | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accessibility settings
  const disableFireRoundLights = useDisableFireRoundLights();
  const disableEarthquakeEffects = useDisableEarthquakeEffects();
  const accessibilityLargeLetters = useLargeLetters();

  // Combine prop and accessibility setting - either can enable large text
  const effectiveLargeText = largeText || accessibilityLargeLetters;

  // PERFORMANCE: Device capability detection for adaptive rendering
  const { isLowEnd, enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // Calculate effective render mode based on device capabilities
  // Using inline calculation to avoid any TDZ/initialization issues
  const effectiveRenderMode: PerformanceMode =
    (isLowEnd || prefersReducedMotion) ? 'minimal' :
      performanceMode === 'minimal' ? 'minimal' :
        performanceMode === 'reduced' ? 'reduced' :
          'full';

  // Sound effects for earthquake
  const { playEarthquakeRumble, playEarthquakeShake } = useSoundEffects();

  // Disable fire round lights on low-end devices or when reduced motion is preferred
  const shouldDisableFireRoundLights = disableFireRoundLights || isLowEnd || !enableComplexAnimations || prefersReducedMotion;

  // Disable enhanced earthquake effects if user preference is set or device is low-end
  const shouldDisableEarthquakeEffects = disableEarthquakeEffects || isLowEnd || prefersReducedMotion;

  // Use extracted interaction hook with desktop enhancements
  const {
    selectedCells,
    fadingCells,
    focusedCell,
    hoveredCell,
    isSelecting,
    isDragging,
    handleTouchStart,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleRightClick,
    handleDoubleClick,
    handleKeyDown,
  } = useGridInteraction({
    grid,
    interactive,
    comboLevel,
    onWordSubmit,
    onPathSubmit,
    externalSelectedCells,
    gridRef,
    fireRoundActive,
    onSingleTapDetected,
    language,
    disableLetterKeyInput,
  });

  // Calculate the word being formed from selected cells
  const formedWord = useMemo(() => {
    return selectedCells.map(c => c.letter).join('');
  }, [selectedCells]);

  // Memoize selected cells length to prevent unnecessary effect runs
  const selectedCellsLength = useMemo(() => selectedCells.length, [selectedCells]);

  // Notify parent of word changes (for external WordFormingArea)
  useEffect(() => {
    if (onWordChange) {
      onWordChange(formedWord, selectedCellsLength);
    }
  }, [formedWord, selectedCellsLength, onWordChange]);

  // Notify parent of selection changes (for BlastTileOverlay selection glow)
  useEffect(() => {
    onSelectionChange?.(selectedCells);
  }, [selectedCells, onSelectionChange]);

  // Calculate adjacent cells for highlighting hints
  const adjacentHintCells = useMemo(() => {
    if (selectedCells.length === 0) return new Set<string>();
    const lastCell = selectedCells[selectedCells.length - 1];
    if (!lastCell) return new Set<string>();

    const hints = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = lastCell.row + dr;
        const newCol = lastCell.col + dc;
        if (newRow >= 0 && newRow < grid.length &&
          newCol >= 0 && newCol < (grid[0]?.length || 0)) {
          // Only hint cells that aren't already selected
          const isAlreadySelected = selectedCells.some(c => c.row === newRow && c.col === newCol);
          if (!isAlreadySelected) {
            hints.add(`${newRow}-${newCol}`);
          }
        }
      }
    }
    return hints;
  }, [selectedCells, grid]);

  // Create set and order map for highlighted cells in revealed word path
  const { highlightedCellsSet, highlightedCellOrder } = useMemo(() => {
    const set = new Set<string>();
    const orderMap = new Map<string, number>();
    highlightedPath.forEach((cell, index) => {
      const key = `${cell.row}-${cell.col}`;
      set.add(key);
      orderMap.set(key, index + 1); // 1-indexed for display
    });
    return { highlightedCellsSet: set, highlightedCellOrder: orderMap };
  }, [highlightedPath]);

  // Hint animation sequence: blink for 1.5s, then fade out for 1s
  useEffect(() => {
    // Clear any existing timers
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    // When highlightedPath changes and has cells, start blink animation
    if (highlightedPath.length > 0) {
      setHintAnimationPhase('blink');

      // After blink duration (1.5s), transition to fadeout
      hintTimeoutRef.current = setTimeout(() => {
        setHintAnimationPhase('fadeout');

        // After fadeout duration (1s), clear the animation phase
        hintTimeoutRef.current = setTimeout(() => {
          setHintAnimationPhase(null);
        }, 1000);
      }, 1500);
    } else {
      // No highlighted path, clear animation state
      setHintAnimationPhase(null);
    }

    // Cleanup on unmount or when highlightedPath changes
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, [highlightedPath]);

  // OPTIMIZED: Earthquake animation using dedicated hook
  // Performance improvements:
  // - Reduced particle count: 30 → 12 (-60%)
  // - Reduced dust clouds: 8 → 4 (-50%)
  // - Optimized displacement: 600-1000px → 300-500px (-50%)
  // - Removed 3D transforms and motion blur
  // - Added screen crack effect
  const {
    earthquakePhase,
    earthquakeParticles,
    earthquakeDust,
    showCracks,
    dustPhase,
    getShakeOffset,
    getPhaseAnimation,
    useEnhancedMode,
  } = useEarthquakeAnimation({
    earthquakeShaking,
    grid,
    effectiveRenderMode,
    shouldDisableEarthquakeEffects,
    prefersReducedMotion,
    playEarthquakeRumble,
    playEarthquakeShake,
  });

  // Fire Round: Random glowing cells with rainbow cycling
  const [glowingCells, setGlowingCells] = useState<Set<string>>(new Set());
  const [cellColorIndices, setCellColorIndices] = useState<Map<string, number>>(new Map());

  // Randomize glowing cells when fire round is active (optimized for performance)
  // PERFORMANCE: Skip on low-end devices, reduced motion, or user accessibility setting
  useEffect(() => {
    if (!fireRoundActive || shouldDisableFireRoundLights) {
      setGlowingCells(new Set());
      setCellColorIndices(new Map());
      return;
    }

    let animationFrameId: number;
    let lastUpdate = 0;
    const updateInterval = 1200; // Gentle: 1200ms for relaxed party feel
    const MAX_GLOW_CELLS = 5; // Fewer cells for subtle, non-distracting effect

    // Check if a cell is adjacent to any already-selected cells
    const isAdjacentToSelected = (row: number, col: number, selected: Set<string>): boolean => {
      // Check all 8 surrounding cells (including diagonals)
      const neighbors = [
        `${row - 1}-${col}`,     // top
        `${row + 1}-${col}`,     // bottom
        `${row}-${col - 1}`,     // left
        `${row}-${col + 1}`,     // right
        `${row - 1}-${col - 1}`, // top-left
        `${row - 1}-${col + 1}`, // top-right
        `${row + 1}-${col - 1}`, // bottom-left
        `${row + 1}-${col + 1}`, // bottom-right
      ];

      return neighbors.some(neighbor => selected.has(neighbor));
    };

    // Select up to 8 cells that are NOT adjacent to each other (disco-style distribution)
    const randomizeGlow = () => {
      const rows = grid.length;
      const cols = grid[0]?.length || 0;
      const selected = new Set<string>();
      const colorMap = new Map<string, number>();

      // Create array of all possible positions
      const allPositions: Array<{ row: number; col: number }> = [];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          allPositions.push({ row: i, col: j });
        }
      }

      // Shuffle positions for random selection
      const shuffled = allPositions.sort(() => Math.random() - 0.5);

      // Select cells ensuring they're not adjacent
      for (const pos of shuffled) {
        if (selected.size >= MAX_GLOW_CELLS) break;

        if (!isAdjacentToSelected(pos.row, pos.col, selected)) {
          const cellKey = `${pos.row}-${pos.col}`;
          selected.add(cellKey);
          // Assign random rainbow color index to each cell
          colorMap.set(cellKey, Math.floor(Math.random() * RAINBOW_COLORS.length));
        }
      }

      setGlowingCells(selected);
      setCellColorIndices(colorMap);
    };

    // Initial randomization
    randomizeGlow();

    // Use requestAnimationFrame for smoother updates
    const animate = (timestamp: number) => {
      if (timestamp - lastUpdate >= updateInterval) {
        randomizeGlow();
        lastUpdate = timestamp;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [fireRoundActive, shouldDisableFireRoundLights, grid]);

  // Auto-focus on grid when game becomes interactive
  useEffect(() => {
    if (interactive && gridRef.current) {
      gridRef.current.focus();
    }
  }, [interactive]);

  // Detect reduced motion preference
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(!!mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduceMotion(!!e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    } catch {
      setReduceMotion(false);
      return undefined;
    }
  }, []);

  // Detect device performance capabilities
  useEffect(() => {
    setPerformanceMode(getPerformanceMode());
  }, []);

  const comboColors = useMemo(() => getComboColors(comboLevel), [comboLevel]);

  // Memoize grid dimensions to prevent recalculations
  // Responsive gaps: tighter on mobile, more spacing on larger screens
  const gridDimensions = useMemo(() => ({
    cols: grid[0]?.length || 4,
    rows: grid.length || 4,
    gap: GRID_GAP_CLASS,
  }), [grid]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* ARIA live region for screen reader announcements of word being formed */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {interactive && formedWord.length > 0 ? `Current word: ${formedWord}, ${selectedCells.length} letters` : ''}
      </div>

      {/* Word Preview - Fixed below header, above the grid, doesn't affect grid layout */}
      {/* Can be hidden when using external WordFormingArea component */}
      {!hideWordPreview && (
        <AnimatePresence>
          {interactive && selectedCells.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[90] pointer-events-none"
              aria-hidden="true"
            >
              <div className="bg-neo-cyan text-neo-black border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard flex items-center gap-2 whitespace-nowrap">
                <span className="font-black text-xl sm:text-2xl text-neo-black uppercase tracking-wide">
                  {formedWord}
                </span>
                <span className="text-xs font-bold text-neo-black bg-neo-black/15 px-1.5 py-0.5 rounded">
                  {selectedCells.length}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Combo Indicator - New juicy animation with particles and glow */}
      {/* Can be hidden when using external positioning */}
      {!hideComboIndicator && (
        <ComboIndicator comboLevel={comboLevel} reduceMotion={reduceMotion} />
      )}

      {/* First-time combo explanation tooltip */}
      <ComboExplanationTooltip comboLevel={comboLevel} />


      {/* NEO-BRUTALIST: Clean frame wrapper with OPTIMIZED screen shake during earthquake */}
      <motion.div
        className="game-board-frame relative"
        animate={earthquakePhase === 'quake' && useEnhancedMode ? {
          // OPTIMIZED: Reduced shake intensity (50% reduction)
          x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
          y: [0, -4, 4, -3, 3, -2, 2, -1, 1, 0],
          rotate: [0, -1, 1, -0.5, 0.5, 0],
        } : {
          x: 0,
          y: 0,
          rotate: 0,
        }}
        transition={{
          duration: 0.6, // Reduced from 0.8s
          ease: 'easeInOut',
        }}
      >

        {/* Inner grid container - using absolute positioning to ensure proper dimensions with container queries */}
        <div
          ref={gridRef}
          dir="ltr"
          data-tutorial="grid"
          className={cn(
            "grid touch-none select-none absolute rounded-neo",
            gridDimensions.gap,
            "bg-neo-cream",
            earthquakeShaking && "earthquake-shake",
            // Desktop cursor styles based on interaction state
            interactive && isSelecting && "cursor-crosshair",
            interactive && isDragging && "cursor-grabbing",
            className
          )}
          style={{
            inset: '0',
            padding: GRID_PADDING,
            gridTemplateColumns: `repeat(${gridDimensions.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridDimensions.rows}, minmax(0, 1fr))`,
            backgroundColor: 'var(--neo-cream)',
            ['--cell-font-size' as string]: `calc((100cqw / ${gridDimensions.cols}) * ${effectiveLargeText ? 0.70 : 0.50})`,
            containerType: 'size',
          }}
          role="grid"
          aria-label="Letter grid"
          tabIndex={interactive ? 0 : -1}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleRightClick}
          onKeyDown={handleKeyDown}
        >
          {grid.map((row, i) =>
            row.map((cell, j) => {
              const cellKey = `${i}-${j}`;
              const isSelected = selectedCells.some(c => c.row === i && c.col === j);
              const firstSelected = selectedCells[0];
              const isFirstSelected = firstSelected !== undefined && firstSelected.row === i && firstSelected.col === j;
              const isFading = fadingCells.some(c => c.row === i && c.col === j);
              const isFocused = focusedCell?.row === i && focusedCell?.col === j;
              const isAdjacentHint = adjacentHintCells.has(cellKey);
              const isGlowing = glowingCells.has(cellKey);
              const glowColorIndex = cellColorIndices.get(cellKey) ?? 0;
              const glowColor = RAINBOW_COLORS[glowColorIndex];
              const isHighlighted = highlightedCellsSet.has(cellKey);
              const highlightedOrder = highlightedCellOrder.get(cellKey);
              const isEliminated = eliminatedLetters?.has(cell.toUpperCase()) ?? false;
              // Desktop hover state
              const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
              const isLastSelected = selectedCells.length > 0 &&
                selectedCells[selectedCells.length - 1]?.row === i &&
                selectedCells[selectedCells.length - 1]?.col === j;

              // OPTIMIZED: Get shake offset from hook (no 3D transforms)
              const shakeOffset = getShakeOffset(cellKey);

              return (
                <motion.div
                  key={`${i}-${j}`}
                  data-row={i}
                  data-col={j}
                  data-letter={cell}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`Row ${i + 1}, Column ${j + 1}: Letter ${cell}`}
                  tabIndex={interactive ? 0 : -1}
                  onTouchStart={(e) => handleTouchStart(i, j, cell, e)}
                  onMouseDown={(e) => handleMouseDown(i, j, cell, e)}
                  onDoubleClick={() => handleDoubleClick(i, j)}
                  initial={effectiveRenderMode === 'minimal' ? false : (animateOnMount
                    ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
                    : false
                  )}
                  animate={effectiveRenderMode === 'minimal'
                    ? { opacity: 1, rotateX: 0 } // Minimal mode: no complex animations
                    : earthquakePhase !== 'idle' ? (
                      // OPTIMIZED MULTI-PHASE EARTHQUAKE ANIMATION
                      earthquakePhase === 'rumble' ? {
                        ...getPhaseAnimation.rumble.animate,
                        rotateX: 0,
                      } : earthquakePhase === 'quake' ? {
                        // Phase 2: OPTIMIZED QUAKE - removed 3D transforms and motion blur
                        x: shakeOffset.x,
                        y: shakeOffset.y,
                        rotate: shakeOffset.rotate,
                        scale: shakeOffset.scale,
                        opacity: 0.8, // Less transparent for better visibility
                        rotateX: 0,
                      } : earthquakePhase === 'settle' ? {
                        ...getPhaseAnimation.settle.animate,
                        rotateX: 0,
                      } : {
                        // Idle state
                        x: 0,
                        y: 0,
                        rotate: 0,
                        scale: 1,
                        opacity: 1,
                        rotateX: 0,
                      }
                    ) : {
                      scale: isSelected ? 1.05 : (isFading ? 1.02 : 1),
                      opacity: 1,
                      rotate: 0,
                      y: isSelected ? -2 : 0,
                      x: 0,
                      rotateX: 0,
                    }
                  }
                  whileTap={effectiveRenderMode === 'minimal' ? undefined : { scale: 0.95 }}
                  transition={effectiveRenderMode === 'minimal'
                    ? { duration: 0 } // Instant transitions for low-end devices
                    : earthquakePhase !== 'idle' ? (
                      earthquakePhase === 'rumble' ? {
                        ...getPhaseAnimation.rumble.transition,
                        delay: shakeOffset.delay,
                      } : earthquakePhase === 'quake' ? {
                        // OPTIMIZED: Faster spring physics
                        ...getPhaseAnimation.quake.transition,
                        delay: shakeOffset.delay,
                      } : earthquakePhase === 'settle' ? {
                        ...getPhaseAnimation.settle.transition,
                        delay: shakeOffset.delay,
                      } : {
                        duration: 0.1,
                      }
                    ) : {
                      // Elastic snap-back after shake or normal animation
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                      delay: reduceMotion ? 0 : (animateOnMount ? (i + j) * 0.03 : 0),
                    }
                  }
                  className={cn(
                    "aspect-square flex items-center justify-center font-black cursor-pointer relative overflow-hidden",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan",
                    isSelected
                      ? comboColors.isRainbow
                        ? `${comboColors.textColor || 'text-neo-black'} border-2 border-neo-black/60 z-10`
                        : `${comboColors.bg} ${comboColors.textColor || 'text-neo-black'} border-2 border-neo-black/60 z-10`
                      : isHighlighted
                        ? `bg-neo-lime text-neo-black border-2 border-neo-black/60 z-10 shadow-[0_0_12px_rgba(255,225,53,0.5)] ${
                            hintAnimationPhase === 'blink' ? 'animate-hint-blink' :
                            hintAnimationPhase === 'fadeout' ? 'animate-hint-fadeout' :
                            ''
                          }`
                        : isEliminated
                          ? "bg-gray-400/60 text-gray-500/50 border border-gray-400/30 shadow-none cursor-not-allowed"
                          : "letter-tile-gradient text-neo-black border-2 border-neo-black/30 shadow-sm hover:shadow-md hover:border-neo-black/50 active:shadow-none",
                    // Adjacent cell hint - subtle glow indicating valid next selection
                    isAdjacentHint && !isSelected && !isHighlighted && !isEliminated && "ring-2 ring-neo-lime/70 ring-offset-1 ring-offset-neo-cream",
                    // Desktop hover on adjacent hint - stronger glow when hovering over valid next cell
                    isHovered && isAdjacentHint && !isSelected && !isHighlighted && !isEliminated && "ring-4 ring-neo-cyan/90 ring-offset-2 scale-105 z-10",
                    // Hover on last selected cell - strong visual hint to click again to submit word
                    // Green ring + scale indicates "click to submit"
                    isHovered && isLastSelected && selectedCells.length >= 2 && "ring-4 ring-neo-green ring-offset-2 scale-110",
                    // All selected cells get slight lift on desktop to feel "sticky" and persistent
                    isSelected && !isHovered && "shadow-hard-sm",
                    // Keyboard focus indicator - enhanced with glow animation
                    isFocused && !isSelected && "z-20 animate-keyboard-focus",
                    // Transition controls
                    "transition-all",
                    comboLevel > 0 ? "duration-300" : "duration-100"
                  )}
                  style={{
                    borderRadius: '6px',
                    fontSize: 'var(--cell-font-size)',
                    // Rainbow dance floor effect during fire round (subtle glow)
                    ...(isGlowing && fireRoundActive && !isSelected && !isHighlighted && {
                      background: glowColor,
                      boxShadow: `0 0 6px ${glowColor}40`,
                      animation: 'rainbow-pulse 1.5s ease-in-out infinite',
                      willChange: 'transform, box-shadow',
                    }),
                    // Subtle glow for selected cells - clean minimal design
                    ...(isSelected && {
                      boxShadow: comboColors.isRainbow
                        ? '0 0 12px rgba(255, 51, 102, 0.4), 0 0 20px rgba(0, 255, 255, 0.2)'
                        : comboLevel >= 5
                          ? '0 0 10px rgba(255, 107, 53, 0.4)'
                          : comboLevel >= 3
                            ? '0 0 8px rgba(255, 150, 50, 0.3)'
                            : '0 0 6px rgba(255, 200, 100, 0.3)',
                    }),
                    ...(isSelected && comboColors.isRainbow ? {
                      background: 'linear-gradient(135deg, #FF3366, #FF6B35, #FFE135, #BFFF00, #00FFFF, #FF1493, #8B5CF6)',
                      backgroundSize: '300% 300%',
                      // Removed strobe effects for accessibility - slow rainbow animation only
                      animation: reduceMotion ? 'none' : 'rainbow-cell 2s ease infinite'
                    } : isSelected && comboLevel >= 5 ? {
                      background: 'linear-gradient(135deg, #FF6B35, #FF3366, #FF6B35)',
                      backgroundSize: '200% 200%',
                      animation: 'gradient-x 1.5s ease infinite'
                    } : isSelected && comboLevel >= 3 ? {
                      background: 'linear-gradient(135deg, #F97316, #EF4444)',
                    } : isSelected && comboColors.flicker ? {
                      animation: 'flicker 0.1s infinite alternate'
                    } : {})
                  }}
                >
                  {/* Ripple effect on selection - disabled on minimal mode for performance */}
                  {isSelected && effectiveRenderMode !== 'minimal' && (
                    <>
                      {/* Primary ripple - shown in reduced and full modes - MORE PROMINENT */}
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          borderRadius: '6px',
                          background: comboColors.isRainbow
                            ? 'radial-gradient(circle, rgba(255,51,102,0.7), rgba(0,255,255,0.4) 50%, transparent 75%)'
                            : comboLevel >= 5
                              ? 'radial-gradient(circle, rgba(255,107,53,0.7), rgba(255,51,102,0.4) 50%, transparent 75%)'
                              : comboLevel >= 3
                                ? 'radial-gradient(circle, rgba(255,150,50,0.6), transparent 70%)'
                                : 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)',
                        }}
                        initial={{ scale: 0.3, opacity: 1 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                      {/* Secondary glow pulse - only in full mode - ENHANCED */}
                      {effectiveRenderMode === 'full' && (
                        <motion.div
                          className="absolute inset-[-4px] pointer-events-none"
                          style={{
                            background: comboColors.isRainbow
                              ? 'radial-gradient(circle at center, rgba(255, 51, 102, 0.9), rgba(0, 255, 255, 0.5) 40%, transparent 70%)'
                              : comboLevel >= 5
                                ? 'radial-gradient(circle at center, rgba(255, 107, 53, 0.9), rgba(255, 51, 102, 0.5) 40%, transparent 70%)'
                                : comboLevel >= 3
                                  ? 'radial-gradient(circle at center, rgba(255, 150, 50, 0.8), transparent 60%)'
                                  : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.95), transparent 60%)',
                            filter: 'blur(4px)',
                            borderRadius: '10px'
                          }}
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: [0, 1.5, 1.8], opacity: [1, 0.7, 0] }}
                          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />
                      )}
                      {/* Combo level glow ring - reduced and full modes - ENHANCED with pulsing */}
                      {comboLevel >= 3 && !reduceMotion && (
                        <motion.div
                          className="absolute inset-[-6px] pointer-events-none"
                          style={{
                            borderRadius: '12px',
                            border: comboColors.isRainbow
                              ? '3px solid rgba(255, 51, 102, 0.9)'
                              : comboLevel >= 7
                                ? '3px solid rgba(255, 51, 102, 0.8)'
                                : comboLevel >= 5
                                  ? '3px solid rgba(255, 107, 53, 0.8)'
                                  : '2px solid rgba(255, 150, 50, 0.7)',
                            boxShadow: comboColors.isRainbow
                              ? '0 0 16px rgba(255, 51, 102, 0.7), inset 0 0 12px rgba(0, 255, 255, 0.4), 0 0 24px rgba(0, 255, 255, 0.3)'
                              : comboLevel >= 7
                                ? '0 0 14px rgba(255, 51, 102, 0.6), 0 0 20px rgba(255, 107, 53, 0.4)'
                                : comboLevel >= 5
                                  ? '0 0 12px rgba(255, 107, 53, 0.6), 0 0 18px rgba(255, 150, 50, 0.3)'
                                  : '0 0 10px rgba(255, 150, 50, 0.5)',
                          }}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{
                            scale: [0.9, 1.15, 1.05],
                            opacity: [0, 1, 0.8],
                          }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      )}

                      {/* Sparkle burst - first letter gets extra flair (full mode only) - ENHANCED */}
                      {isFirstSelected && !reduceMotion && effectiveRenderMode === 'full' && (
                        <>
                          {[...Array(6)].map((_, idx) => {
                            const angle = (idx * 60) * (Math.PI / 180);
                            const distance = 32;
                            const colors = comboColors.isRainbow
                              ? ['#FF3366', '#00FFFF', '#FFE135', '#FF1493', '#BFFF00', '#8B5CF6']
                              : comboLevel >= 5
                                ? ['#FF3366', '#FF6B35', '#FFE135', '#FF1493', '#FFA500', '#FFD700']
                                : ['#FFD700', '#FF6B35', '#FF3366', '#FFA500', '#FFE135', '#FF9500'];
                            return (
                              <motion.div
                                key={`first-burst-${idx}`}
                                className="absolute pointer-events-none rounded-full"
                                style={{
                                  width: 8,
                                  height: 8,
                                  background: colors[idx],
                                  left: '50%',
                                  top: '50%',
                                  marginLeft: -4,
                                  marginTop: -4,
                                  boxShadow: `0 0 6px ${colors[idx]}`,
                                }}
                                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                animate={{
                                  scale: [0, 1.5, 0],
                                  opacity: [0, 1, 0],
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance,
                                }}
                                transition={{
                                  duration: 0.45,
                                  ease: 'easeOut',
                                }}
                              />
                            );
                          })}
                        </>
                      )}

                      {/* Center burst particles - full mode only - ENHANCED */}
                      {!reduceMotion && effectiveRenderMode === 'full' && comboLevel >= 2 && (
                        <>
                          {[...Array(6)].map((_, idx) => {
                            const angle = (idx * 60 + 30) * (Math.PI / 180);
                            const distance = comboLevel >= 5 ? 24 : 20;
                            const particleColors = comboColors.isRainbow
                              ? ['#FF1493', '#00FFFF', '#FFE135', '#BFFF00', '#FF3366', '#8B5CF6']
                              : comboLevel >= 5
                                ? ['#FF3366', '#FF6B35', '#FFE135', '#FF1493', '#FFA500', '#FFD700']
                                : ['#FF6B35', '#FFE135', '#FF3366', '#FFA500', '#FFD700', '#FF9500'];
                            const particleColor = particleColors[idx % particleColors.length];
                            return (
                              <motion.div
                                key={`burst-${idx}`}
                                className="absolute rounded-full pointer-events-none"
                                style={{
                                  width: 6,
                                  height: 6,
                                  background: particleColor,
                                  left: '50%',
                                  top: '50%',
                                  marginLeft: -3,
                                  marginTop: -3,
                                  boxShadow: `0 0 4px ${particleColor}`,
                                }}
                                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                animate={{
                                  scale: [0, 1.3, 0],
                                  opacity: [0, 1, 0],
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: 'easeOut',
                                }}
                              />
                            );
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* Letter text - positioned above all effects with relative z-index */}
                  <span
                    className="relative z-10 pointer-events-none select-none"
                    style={{
                      textShadow: isSelected
                        ? comboColors.isRainbow || comboLevel >= 5
                          ? '0 2px 4px rgba(0,0,0,0.3)'
                          : '0 1px 2px rgba(0,0,0,0.2)'
                        : 'none',
                    }}
                  >
                    {cell}
                  </span>

                  {/* Path order indicator for highlighted cells */}
                  {isHighlighted && highlightedOrder !== undefined && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-neo-black text-neo-lime text-[10px] font-black rounded-full border-2 border-neo-lime shadow-[0_0_8px_rgba(255,225,53,0.6)]"
                      aria-hidden="true"
                    >
                      {highlightedOrder}
                    </span>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Earthquake Particle Debris - scattered during quake phase */}
        <AnimatePresence>
          {earthquakeParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                border: '2px solid rgb(var(--neo-black))',
                boxShadow: `0 0 ${particle.size}px ${particle.color}40`,
              }}
              initial={{
                scale: 0,
                opacity: 1,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                scale: [0, 1.5, 1, 0],
                opacity: [0, 1, 0.8, 0],
                x: particle.vx,
                y: particle.vy,
                rotate: particle.rotation + 720,
              }}
              exit={{
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          ))}
        </AnimatePresence>

        {/* Earthquake Dust Clouds - rising from bottom during quake */}
        <AnimatePresence>
          {earthquakeDust.map((dust) => (
            <motion.div
              key={dust.id}
              className="absolute pointer-events-none"
              style={{
                left: `${dust.x}%`,
                bottom: '-10%',
                width: dust.size,
                height: dust.size,
                background: 'radial-gradient(circle, rgba(139, 69, 19, 0.4) 0%, rgba(139, 69, 19, 0.2) 40%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(8px)',
              }}
              initial={{
                scale: 0,
                opacity: 0,
                y: 0,
              }}
              animate={{
                scale: [0, 1.2, 1.5],
                opacity: [0, 0.6, 0],
                y: -200 - dust.size,
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
              }}
              transition={{
                duration: 1.2,
                delay: dust.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;
