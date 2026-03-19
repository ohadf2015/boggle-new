import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { LetterGrid, Language } from '@/types';

// Import extracted utilities
import {
  getComboColors,
  useGridInteraction,
  getPerformanceMode,
  ComboIndicator,
  type SelectedCell,
  type PerformanceMode,
} from './grid';
import { GRID_PADDING, GRID_GAP_CLASS } from './grid/gridLayoutConstants';
import GridCellEffects from './grid/GridCellEffects';
import EarthquakeEffects from './grid/EarthquakeEffects';
import { getSelectionEscalation, getEscalationBackground, getEscalationShake } from './grid/selectionEscalation';
import InputModeIndicator, { type InputMode } from './grid/InputModeIndicator';
import DoubleClickIndicator from './grid/DoubleClickIndicator';
import DragReleaseHint from './grid/DragReleaseHint';
import { useDisableEarthquakeEffects, useLargeLetters } from '@/contexts/AccessibilityContext';
import { useDevicePerformance } from '../hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useEarthquakeAnimation } from '../hooks/useEarthquakeAnimation';

/** Cell position for highlighted paths */
export interface HighlightedCell {
  row: number;
  col: number;
}

/** Props for memoized grid cell */
interface GridCellProps {
  cell: string;
  row: number;
  col: number;
  isSelected: boolean;
  isFirstSelected: boolean;
  isLastSelected: boolean;
  isFading: boolean;
  isFocused: boolean;
  isAdjacentHint: boolean;
  isHighlighted: boolean;
  isEliminated: boolean;
  isHovered: boolean;
  highlightedOrder: number | undefined;
  selectionIdx: number;
  escalation: ReturnType<typeof getSelectionEscalation> | null;
  shakeOffset: { x: number; y: number; rotate: number; scale: number; delay: number };
  effectiveRenderMode: PerformanceMode;
  earthquakePhase: string;
   
  getPhaseAnimation: Record<string, { animate?: any; transition: any }>;
  comboLevel: number;
  comboColors: ReturnType<typeof getComboColors>;
  reduceMotion: boolean;
  animateOnMount: boolean;
  interactive: boolean;
  isSelecting: boolean;
  isDragging: boolean;
  isTypingMode: boolean;
  hintAnimationPhase: 'blink' | 'fadeout' | null;
  currentTier: number;
  selectedCellsLength: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

const GridCell = memo<GridCellProps>(({
  cell, row, col,
  isSelected, isFirstSelected, isLastSelected, isFading, isFocused,
  isAdjacentHint, isHighlighted, isEliminated, isHovered,
  highlightedOrder, selectionIdx, escalation, shakeOffset,
  effectiveRenderMode, earthquakePhase, getPhaseAnimation,
  comboLevel, comboColors, reduceMotion, animateOnMount, interactive,
  isSelecting, isDragging, isTypingMode, hintAnimationPhase,
  currentTier, selectedCellsLength,
  onTouchStart, onMouseDown, onDoubleClick,
}) => (
  <motion.div
    key={`${row}-${col}`}
    data-row={row}
    data-col={col}
    data-letter={cell}
    role="gridcell"
    aria-selected={isSelected}
    aria-label={`Row ${row + 1}, Column ${col + 1}: Letter ${cell}`}
    tabIndex={interactive ? 0 : -1}
    onTouchStart={onTouchStart}
    onMouseDown={onMouseDown}
    onDoubleClick={onDoubleClick}
    initial={effectiveRenderMode === 'minimal' ? false : (animateOnMount
      ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
      : false
    )}
    animate={effectiveRenderMode === 'minimal'
      ? { opacity: 1, rotateX: 0 }
      : earthquakePhase !== 'idle' ? (
        earthquakePhase === 'rumble' ? {
          ...getPhaseAnimation.rumble.animate,
          rotateX: 0,
        } : earthquakePhase === 'quake' ? {
          x: shakeOffset.x,
          y: shakeOffset.y,
          rotate: shakeOffset.rotate,
          scale: shakeOffset.scale,
          opacity: 0.8,
          rotateX: 0,
        } : earthquakePhase === 'settle' ? {
          ...getPhaseAnimation.settle.animate,
          rotateX: 0,
        } : {
          x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, rotateX: 0,
        }
      ) : {
        scale: isSelected ? (escalation?.scale ?? 1.05)
          : currentTier >= 3 && !isEliminated ? 0.96
          : (isFading ? 1.02 : 1),
        opacity: 1,
        rotate: 0,
        y: isSelected ? (escalation?.liftY ?? -2) : 0,
        x: 0,
        rotateX: 0,
      }
    }
    whileTap={effectiveRenderMode === 'minimal' ? undefined : { scale: 0.95 }}
    transition={effectiveRenderMode === 'minimal'
      ? { duration: 0 }
      : earthquakePhase !== 'idle' ? (
        earthquakePhase === 'rumble' ? {
          ...getPhaseAnimation.rumble.transition,
          delay: shakeOffset.delay,
        } : earthquakePhase === 'quake' ? {
          ...getPhaseAnimation.quake.transition,
          delay: shakeOffset.delay,
        } : earthquakePhase === 'settle' ? {
          ...getPhaseAnimation.settle.transition,
          delay: shakeOffset.delay,
        } : {
          duration: 0.1,
        }
      ) : {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: reduceMotion ? 0 : (animateOnMount ? (row + col) * 0.03 : 0),
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
              isTypingMode ? 'animate-keyboard-light-up' :
              hintAnimationPhase === 'blink' ? 'animate-hint-blink' :
              hintAnimationPhase === 'fadeout' ? 'animate-hint-fadeout' :
              ''
            }`
          : isEliminated
            ? "bg-gray-400/60 text-gray-500/50 border border-gray-400/30 shadow-none cursor-not-allowed"
            : "letter-tile-gradient text-neo-black border-2 border-neo-black/30 shadow-sm hover:shadow-md hover:border-neo-black/50 active:shadow-none",
      isAdjacentHint && !isSelected && !isHighlighted && !isEliminated && "ring-2 ring-neo-lime/70 ring-offset-1 ring-offset-neo-cream",
      isHovered && isAdjacentHint && !isSelected && !isHighlighted && !isEliminated && "ring-4 ring-neo-cyan/90 ring-offset-2 scale-105 z-10",
      isHovered && isLastSelected && selectedCellsLength >= 2 && "ring-4 ring-neo-green ring-offset-2 scale-110",
      isSelecting && selectedCellsLength > 0 && !isSelected && !isAdjacentHint && !isHighlighted && "opacity-40 cursor-not-allowed",
      isLastSelected && isSelecting && !isDragging && "animate-anchor-pulse z-20",
      isSelected && !isHovered && "shadow-hard-sm",
      isFocused && !isSelected && "z-20 animate-keyboard-focus",
      "transition-all",
      comboLevel > 0 ? "duration-300" : "duration-100"
    )}
    style={{
      borderRadius: '6px',
      fontSize: 'var(--cell-font-size)',
      ...(isSelected && {
        boxShadow: escalation?.glow ?? '0 0 6px rgba(255, 200, 100, 0.3)',
        borderColor: escalation?.borderColor,
      }),
      ...(isSelected && comboColors.isRainbow ? {
        background: 'linear-gradient(135deg, #FF3366, #FF6B35, #FFE135, #BFFF00, #00FFFF, #FF1493, #8B5CF6)',
        backgroundSize: '300% 300%',
        animation: reduceMotion ? 'none' : `rainbow-cell ${Math.max(0.4, 2 - (selectedCellsLength - 6) * 0.2)}s ease infinite`
      } : isSelected && comboLevel >= 5 ? {
        background: 'linear-gradient(135deg, #FF6B35, #FF3366, #FF6B35)',
        backgroundSize: '200% 200%',
        animation: 'gradient-x 1.5s ease infinite'
      } : isSelected && comboLevel >= 3 ? {
        background: 'linear-gradient(135deg, #F97316, #EF4444)',
      } : isSelected && comboColors.flicker ? {
        animation: 'flicker 0.1s infinite alternate'
      } : isSelected && escalation && escalation.tier >= 1 ? {
        ...getEscalationBackground(selectionIdx, selectedCellsLength, comboLevel),
        ...(!reduceMotion && getEscalationShake(selectedCellsLength, comboLevel) ? {
          animation: [
            getEscalationBackground(selectionIdx, selectedCellsLength, comboLevel).animation,
            `${getEscalationShake(selectedCellsLength, comboLevel)} ${escalation.tier >= 3 ? '0.08s' : escalation.tier >= 2 ? '0.12s' : '0.15s'} infinite`,
          ].filter(Boolean).join(', '),
        } : {}),
      } : {}),
      ...(isHighlighted && isTypingMode && highlightedOrder !== undefined ? {
        animationDelay: `${(highlightedOrder - 1) * 50}ms`,
        animationFillMode: 'both',
      } : {})
    }}
  >
    <GridCellEffects
      isSelected={isSelected}
      isFirstSelected={isFirstSelected}
      comboLevel={comboLevel}
      comboColors={comboColors}
      effectiveRenderMode={effectiveRenderMode}
      reduceMotion={reduceMotion}
      selectionIndex={selectionIdx}
      totalSelected={selectedCellsLength}
    />

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

    {isHighlighted && highlightedOrder !== undefined && (
      <span
        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-neo-black text-neo-lime text-[10px] font-black rounded-full border-2 border-neo-lime shadow-[0_0_8px_rgba(255,225,53,0.6)]"
        aria-hidden="true"
      >
        {highlightedOrder}
      </span>
    )}

    <DoubleClickIndicator
      visible={isLastSelected && isSelecting && !isDragging && selectedCellsLength >= 2}
    />
  </motion.div>
));

GridCell.displayName = 'GridCell';

interface GridComponentProps {
  grid: LetterGrid;
  interactive?: boolean;
  onWordSubmit?: (word: string) => void;
  onPathSubmit?: (cells: SelectedCell[]) => void;
  selectedCells?: SelectedCell[];
  className?: string;
  largeText?: boolean;
  comboLevel?: number;
  animateOnMount?: boolean;
  fireRoundActive?: boolean;
  earthquakeShaking?: boolean;
  onWordChange?: (word: string, letterCount: number) => void;
  hideWordPreview?: boolean;
  hideComboIndicator?: boolean;
  highlightedPath?: HighlightedCell[];
  eliminatedLetters?: Set<string>;
  onSingleTapDetected?: (cell: { row: number; col: number; letter: string }) => void;
  language?: Language;
  disableLetterKeyInput?: boolean;
  onSelectionChange?: (cells: SelectedCell[]) => void;
  /** Whether keyboard typing mode is active (from useKeyboardWordInput) */
  isTypingMode?: boolean;
}

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
  isTypingMode = false,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('full');
  const gridRef = useRef<HTMLDivElement>(null);

  const [dragSubmitCount, setDragSubmitCount] = useState(0);
  const prevSelectedLengthRef = useRef(0);
  const [hintAnimationPhase, setHintAnimationPhase] = useState<'blink' | 'fadeout' | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disableEarthquakeEffects = useDisableEarthquakeEffects();
  const accessibilityLargeLetters = useLargeLetters();
  const effectiveLargeText = largeText || accessibilityLargeLetters;

  const { isLowEnd, prefersReducedMotion } = useDevicePerformance();
  const effectiveRenderMode: PerformanceMode =
    (isLowEnd || prefersReducedMotion) ? 'minimal' :
      performanceMode === 'minimal' ? 'minimal' :
        performanceMode === 'reduced' ? 'reduced' :
          'full';

  const { playEarthquakeRumble, playEarthquakeShake } = useSoundEffects();
  const shouldDisableEarthquakeEffects = disableEarthquakeEffects || isLowEnd || prefersReducedMotion;

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

  // Stable handlers that read row/col from data attributes to avoid inline arrows per cell
  const handleCellTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);
    const letter = el.dataset.letter || '';
    handleTouchStart(row, col, letter, e as React.TouchEvent<HTMLDivElement>);
  }, [handleTouchStart]);

  const handleCellMouseDown = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);
    const letter = el.dataset.letter || '';
    handleMouseDown(row, col, letter, e as React.MouseEvent<HTMLDivElement>);
  }, [handleMouseDown]);

  const handleCellDoubleClick = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);
    handleDoubleClick(row, col);
  }, [handleDoubleClick]);

  const inputMode: InputMode = useMemo(() => {
    if (isTypingMode) return 'keyboard';
    if (isDragging) return 'drag';
    if (isSelecting) return 'click';
    return 'idle';
  }, [isTypingMode, isDragging, isSelecting]);

  const formedWord = useMemo(() => selectedCells.map(c => c.letter).join(''), [selectedCells]);
  const selectedCellsLength = useMemo(() => selectedCells.length, [selectedCells]);

  // Track drag submissions (cells went from >1 to 0 = word submitted)
  useEffect(() => {
    if (prevSelectedLengthRef.current >= 2 && selectedCellsLength === 0) {
      setDragSubmitCount(c => c + 1);
    }
    prevSelectedLengthRef.current = selectedCellsLength;
  }, [selectedCellsLength]);

  useEffect(() => { onWordChange?.(formedWord, selectedCellsLength); }, [formedWord, selectedCellsLength, onWordChange]);
  useEffect(() => { onSelectionChange?.(selectedCells); }, [selectedCells, onSelectionChange]);

  // Pre-compute Sets for O(1) lookups instead of O(n) .some() per cell during render
  const selectedCellsSet = useMemo(
    () => new Set(selectedCells.map(c => `${c.row}-${c.col}`)),
    [selectedCells],
  );
  const fadingCellsSet = useMemo(
    () => new Set(fadingCells.map(c => `${c.row}-${c.col}`)),
    [fadingCells],
  );

  // Map cell key → selection order index (0-based) for escalation effects
  const selectionOrderMap = useMemo(
    () => new Map(selectedCells.map((c, idx) => [`${c.row}-${c.col}`, idx])),
    [selectedCells],
  );

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
          if (!selectedCellsSet.has(`${newRow}-${newCol}`)) {
            hints.add(`${newRow}-${newCol}`);
          }
        }
      }
    }
    return hints;
  }, [selectedCells, selectedCellsSet, grid]);

  const { highlightedCellsSet, highlightedCellOrder } = useMemo(() => {
    const set = new Set<string>();
    const orderMap = new Map<string, number>();
    highlightedPath.forEach((cell, index) => {
      const key = `${cell.row}-${cell.col}`;
      set.add(key);
      orderMap.set(key, index + 1);
    });
    return { highlightedCellsSet: set, highlightedCellOrder: orderMap };
  }, [highlightedPath]);

  useEffect(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    if (highlightedPath.length > 0) {
      setHintAnimationPhase('blink');
      hintTimeoutRef.current = setTimeout(() => {
        setHintAnimationPhase('fadeout');
        hintTimeoutRef.current = setTimeout(() => {
          setHintAnimationPhase(null);
        }, 1000);
      }, 1500);
    } else {
      setHintAnimationPhase(null);
    }

    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, [highlightedPath]);
  const {
    earthquakePhase,
    earthquakeParticles,
    earthquakeDust,
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

  useEffect(() => { if (interactive && gridRef.current) gridRef.current.focus(); }, [interactive]);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(!!mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduceMotion(!!e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    } catch { setReduceMotion(false); return undefined; }
  }, []);

  useEffect(() => { setPerformanceMode(getPerformanceMode()); }, []);

  const comboColors = useMemo(() => getComboColors(comboLevel), [comboLevel]);

  // Current escalation tier (based on total selected letters)
  const currentTier = useMemo(
    () => getSelectionEscalation(0, selectedCells.length, comboLevel).tier,
    [selectedCells.length, comboLevel],
  );

  // Tier transition flash — fires once when crossing a tier boundary
  const prevTierRef = useRef(0);
  const [tierFlash, setTierFlash] = useState<number | null>(null);
  useEffect(() => {
    if (currentTier > prevTierRef.current && currentTier >= 2 && !reduceMotion) {
      setTierFlash(currentTier);
      const timeout = setTimeout(() => setTierFlash(null), 150);
      prevTierRef.current = currentTier;
      return () => clearTimeout(timeout);
    }
    prevTierRef.current = currentTier;
    return undefined;
  }, [currentTier, reduceMotion]);

  const gridDimensions = useMemo(() => ({
    cols: grid[0]?.length || 4,
    rows: grid.length || 4,
    gap: GRID_GAP_CLASS,
  }), [grid]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {interactive && formedWord.length > 0 ? `Current word: ${formedWord}, ${selectedCells.length} letters` : ''}
      </div>

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

      {!hideComboIndicator && (
        <ComboIndicator comboLevel={comboLevel} reduceMotion={reduceMotion} />
      )}

      <motion.div
        className="game-board-frame relative"
        animate={earthquakePhase === 'quake' && useEnhancedMode ? {
          x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
          y: [0, -4, 4, -3, 3, -2, 2, -1, 1, 0],
          rotate: [0, -1, 1, -0.5, 0.5, 0],
        } : {
          x: 0,
          y: 0,
          rotate: 0,
        }}
        transition={{
          duration: 0.6,
          ease: 'easeInOut',
        }}
      >
        <div
          ref={gridRef}
          dir="ltr"
          data-tutorial="grid"
          className={cn(
            "grid touch-none select-none absolute rounded-neo",
            gridDimensions.gap,
            "bg-neo-cream",
            earthquakeShaking && "earthquake-shake",
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
            ...(currentTier >= 3 && !reduceMotion ? {
              filter: 'drop-shadow(2px 0 0 rgba(0,255,255,0.25)) drop-shadow(-2px 0 0 rgba(255,51,102,0.25))',
            } : {}),
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
              const isSelected = selectedCellsSet.has(cellKey);
              const firstSelected = selectedCells[0];
              const isFirstSelected = firstSelected !== undefined && firstSelected.row === i && firstSelected.col === j;
              const isFading = fadingCellsSet.has(cellKey);
              const isFocused = focusedCell?.row === i && focusedCell?.col === j;
              const isAdjacentHint = adjacentHintCells.has(cellKey);
              const isHighlighted = highlightedCellsSet.has(cellKey);
              const highlightedOrder = highlightedCellOrder.get(cellKey);
              const isEliminated = eliminatedLetters?.has(cell.toUpperCase()) ?? false;
              const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
              const isLastSelected = selectedCells.length > 0 &&
                selectedCells[selectedCells.length - 1]?.row === i &&
                selectedCells[selectedCells.length - 1]?.col === j;

              const shakeOffset = getShakeOffset(cellKey);
              const selectionIdx = selectionOrderMap.get(cellKey) ?? 0;
              const escalation = isSelected
                ? getSelectionEscalation(selectionIdx, selectedCells.length, comboLevel)
                : null;

              return (
                <GridCell
                  key={cellKey}
                  cell={cell}
                  row={i}
                  col={j}
                  isSelected={isSelected}
                  isFirstSelected={isFirstSelected}
                  isLastSelected={isLastSelected}
                  isFading={isFading}
                  isFocused={isFocused}
                  isAdjacentHint={isAdjacentHint}
                  isHighlighted={isHighlighted}
                  isEliminated={isEliminated}
                  isHovered={isHovered}
                  highlightedOrder={highlightedOrder}
                  selectionIdx={selectionIdx}
                  escalation={escalation}
                  shakeOffset={shakeOffset}
                  effectiveRenderMode={effectiveRenderMode}
                  earthquakePhase={earthquakePhase}
                  getPhaseAnimation={getPhaseAnimation}
                  comboLevel={comboLevel}
                  comboColors={comboColors}
                  reduceMotion={reduceMotion}
                  animateOnMount={animateOnMount}
                  interactive={interactive}
                  isSelecting={isSelecting}
                  isDragging={isDragging}
                  isTypingMode={isTypingMode}
                  hintAnimationPhase={hintAnimationPhase}
                  currentTier={currentTier}
                  selectedCellsLength={selectedCells.length}
                  onTouchStart={handleCellTouchStart}
                  onMouseDown={handleCellMouseDown}
                  onDoubleClick={handleCellDoubleClick}
                />
              );
            })
          )}
        </div>

        {/* Tier transition flash overlay */}
        <AnimatePresence>
          {tierFlash !== null && (
            <motion.div
              key={`tier-flash-${tierFlash}`}
              className="absolute inset-0 pointer-events-none z-30 rounded-neo"
              style={{
                background: tierFlash >= 3
                  ? 'radial-gradient(circle, rgba(0,255,255,0.6), rgba(255,51,102,0.3) 60%, transparent 85%)'
                  : 'radial-gradient(circle, rgba(255,255,255,0.7), rgba(255,20,147,0.2) 60%, transparent 85%)',
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        <EarthquakeEffects
          particles={earthquakeParticles}
          dust={earthquakeDust}
        />

        {interactive && (
          <>
            <DragReleaseHint
              isDragging={isDragging}
              selectedCellCount={selectedCells.length}
              wordSubmitted={dragSubmitCount > 0}
            />
            <InputModeIndicator activeMode={inputMode} />
          </>
        )}
      </motion.div>
    </div>
  );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;
