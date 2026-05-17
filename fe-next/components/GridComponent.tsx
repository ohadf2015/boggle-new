import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { cn } from '../lib/utils';
import type { LetterGrid, Language } from '@/types';
import { useGridAriaLabels } from '@/hooks/useGridAriaLabels';

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
import EarthquakeEffects from './grid/EarthquakeEffects';
import { getSelectionEscalation } from './grid/selectionEscalation';
import DragReleaseHint from './grid/DragReleaseHint';
import GridConnectorOverlay from './grid/GridConnectorOverlay';
import { useDisableEarthquakeEffects, useLargeLetters } from '@/contexts/AccessibilityContext';
import { useDevicePerformance } from '../hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEarthquakeAnimation } from '../hooks/useEarthquakeAnimation';
import GridCell, { type HighlightedCell } from './grid/GridCell';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';

export type { HighlightedCell } from './grid/GridCell';

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
  /** Optional filter — return false to prevent a cell from being selected (e.g. ice tiles) */
  cellFilter?: (row: number, col: number) => boolean;
  /** Golden letter positions from backend startGame payload */
  goldenLetters?: Array<{ row: number; col: number }>;
  /** Round event tile states */
  frozenTiles?: Set<string>;
  chargedTiles?: Set<string>;
  meteorTiles?: Set<string>;
  /** Ghost mode: transparent bg + invisible cells (blast mode — overlay handles visuals) */
  ghostCells?: boolean;
  /** Optional adjacency override — return true if cell2 should be reachable from cell1 (e.g. portal teleportation) */
  isAdjacent?: (cell1: { row: number; col: number }, cell2: { row: number; col: number }) => boolean;
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
  cellFilter,
  goldenLetters = [],
  frozenTiles,
  chargedTiles,
  meteorTiles,
  ghostCells = false,
  isAdjacent,
}) => {
  const { t } = useLanguage();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('full');
  const gridRef = useRef<HTMLDivElement>(null);

  const [dragSubmitCount, setDragSubmitCount] = useState(0);
  const prevSelectedLengthRef = useRef(0);
  const [hintAnimationPhase, setHintAnimationPhase] = useState<'blink' | 'fadeout' | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const equippedBoardTheme = useEquippedCosmetic('boardTheme');
  const equippedTileSkin = useEquippedCosmetic('tileSkin');

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
    cellFilter,
    isAdjacent,
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

  const formedWord = useMemo(() => selectedCells.map(c => c.letter).join(''), [selectedCells]);
  const selectedCellsLength = useMemo(() => selectedCells.length, [selectedCells]);

  // Track drag submissions (cells went from >1 to 0 = word submitted)
  useEffect(() => {
    if (prevSelectedLengthRef.current >= 2 && selectedCellsLength === 0) {
      setDragSubmitCount(c => c + 1);
    }
    prevSelectedLengthRef.current = selectedCellsLength;
  }, [selectedCellsLength]);

  // Guard onWordChange / onSelectionChange against same-value re-fires.
  // Without these refs, every selectedCells ref change during drag fires the
  // callbacks even when (word, count) and selection identity haven't shifted —
  // each fire bubbles into useSelectionStore.setState and downstream
  // consumers, doubling render cost on touch swipes.
  const prevWordRef = useRef<{ word: string; count: number }>({ word: '', count: 0 });
  useEffect(() => {
    const prev = prevWordRef.current;
    if (prev.word === formedWord && prev.count === selectedCellsLength) return;
    prevWordRef.current = { word: formedWord, count: selectedCellsLength };
    onWordChange?.(formedWord, selectedCellsLength);
  }, [formedWord, selectedCellsLength, onWordChange]);

  const prevSelectionRef = useRef<SelectedCell[] | null>(null);
  useEffect(() => {
    if (!onSelectionChange) return;
    const prev = prevSelectionRef.current;
    if (
      prev &&
      prev.length === selectedCells.length &&
      prev.every((c, i) => c.row === selectedCells[i].row && c.col === selectedCells[i].col)
    ) {
      return;
    }
    prevSelectionRef.current = selectedCells;
    onSelectionChange(selectedCells);
  }, [selectedCells, onSelectionChange]);

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

  const goldenCellsSet = useMemo(
    () => new Set(goldenLetters.map(c => `${c.row}-${c.col}`)),
    [goldenLetters],
  );

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

  // Cooldown warmth — carries residual combo boost from previous word
  // so the next word's escalation starts "warm" instead of cold-snapping to tier 0
  const [cooldownCombo, setCooldownCombo] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelLenForCooldownRef = useRef(selectedCells.length);
  useEffect(() => {
    const wasSelecting = prevSelLenForCooldownRef.current > 0;
    const nowEmpty = selectedCells.length === 0;
    if (wasSelecting && nowEmpty) {
      const lastTier = getSelectionEscalation(0, prevSelLenForCooldownRef.current, comboLevel).tier;
      if (lastTier > 0 && !reduceMotion) {
        setCooldownCombo(lastTier * 2);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => setCooldownCombo(0), 500);
      }
    }
    prevSelLenForCooldownRef.current = selectedCells.length;
  }, [selectedCells.length, comboLevel, reduceMotion]);
  useEffect(() => {
    return () => { if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current); };
  }, []);

  // Effective combo includes cooldown warmth for smoother tier transitions
  const effectiveCombo = comboLevel + cooldownCombo;

  // Current escalation tier (based on total selected letters)
  const currentTier = useMemo(
    () => getSelectionEscalation(0, selectedCells.length, effectiveCombo).tier,
    [selectedCells.length, effectiveCombo],
  );
  // Boolean view of currentTier for non-selected cells: only flips at the tier-3
  // boundary, so cells skip re-render waves when escalation crosses tier 1→2.
  const isHighTier = currentTier >= 3;

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

  // Clamp selection length for non-selected cells: they only need to know
  // whether ANY selection exists (0 vs 1), not the exact count.
  // This prevents all 16+ cells from re-rendering on every letter addition
  // since memo() sees a stable prop (0 or 1) instead of 0→1→2→3→...
  const hasAnySelection = selectedCells.length > 0 ? 1 : 0;

  const gridDimensions = useMemo(() => ({
    cols: grid[0]?.length || 4,
    rows: grid.length || 4,
    gap: GRID_GAP_CLASS,
  }), [grid]);

  // Stable board seed for memoization — changes only when actual letters change
  const boardSeed = useMemo(
    () => grid.map(r => r.join('')).join('|'),
    [grid],
  );

  // Per-cell aria-label memoized by board seed. Closes mp-perf H3:
  // Previously fired 16 t() calls per render during drag selection.
  // Now fires 16 t() calls per round (when boardSeed changes).
  const cellAriaLabels = useGridAriaLabels(grid, boardSeed);

  return (
    <LazyMotion features={domAnimation} strict>
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
            <m.div
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
            </m.div>
          )}
        </AnimatePresence>
      )}

      {!hideComboIndicator && (
        <ComboIndicator comboLevel={comboLevel} reduceMotion={reduceMotion} />
      )}

      <m.div
        className={cn("game-board-frame relative", equippedBoardTheme && `cosmetic-board-${equippedBoardTheme.replace('board-', '')}`)}
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
          {...(equippedTileSkin && { 'data-tile-skin': equippedTileSkin.replace('tile-', '') })}
          className={cn(
            "grid touch-none select-none absolute rounded-neo",
            gridDimensions.gap,
            !ghostCells && "bg-neo-cream",
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
            backgroundColor: ghostCells ? 'transparent' : 'var(--neo-cream)',
            // Chromatic aberration on the whole board is a heavy compositor
            // pass; suppress while the user is mid-drag so pointer moves don't
            // re-rasterize the grid every frame. Re-applies after release.
            ...(currentTier >= 3 && !reduceMotion && !isDragging ? {
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
              const isGolden = goldenCellsSet.has(cellKey);
              const isEliminated = eliminatedLetters?.has(cell.toUpperCase()) ?? false;
              const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
              const isLastSelected = selectedCells.length > 0 &&
                selectedCells[selectedCells.length - 1]?.row === i &&
                selectedCells[selectedCells.length - 1]?.col === j;

              const shakeOffset = getShakeOffset(cellKey);
              const selectionIdx = selectionOrderMap.get(cellKey) ?? 0;
              const escalation = isSelected
                ? getSelectionEscalation(selectionIdx, selectedCells.length, effectiveCombo)
                : null;

              const isFrozen = frozenTiles?.has(cellKey) ?? false;
              const isCharged = chargedTiles?.has(cellKey) ?? false;
              const isMeteor = meteorTiles?.has(cellKey) ?? false;

              return (
                <GridCell
                  key={cellKey}
                  cell={cell}
                  row={i}
                  col={j}
                  ghost={ghostCells}
                  isSelected={isSelected}
                  isFirstSelected={isFirstSelected}
                  isLastSelected={isLastSelected}
                  isFading={isFading}
                  isFocused={isFocused}
                  isAdjacentHint={isAdjacentHint}
                  isHighlighted={isHighlighted}
                  isGolden={isGolden}
                  isEliminated={isEliminated}
                  isHovered={isHovered}
                  isFrozen={isFrozen}
                  isCharged={isCharged}
                  isMeteor={isMeteor}
                  highlightedOrder={highlightedOrder}
                  selectionIdx={selectionIdx}
                  escalation={escalation}
                  shakeOffset={shakeOffset}
                  effectiveRenderMode={effectiveRenderMode}
                  earthquakePhase={earthquakePhase}
                  getPhaseAnimation={getPhaseAnimation}
                  comboLevel={comboLevel}
                  escalationCombo={effectiveCombo}
                  comboColors={comboColors}
                  reduceMotion={reduceMotion}
                  animateOnMount={animateOnMount}
                  interactive={interactive}
                  isSelecting={isSelecting}
                  isDragging={isDragging}
                  isTypingMode={isTypingMode}
                  hintAnimationPhase={hintAnimationPhase}
                  isHighTier={isHighTier}
                  selectedCellsLength={isSelected || isLastSelected ? selectedCells.length : hasAnySelection}
                  onTouchStart={handleCellTouchStart}
                  onMouseDown={handleCellMouseDown}
                  onDoubleClick={handleCellDoubleClick}
                  ariaLabel={cellAriaLabels[`${i},${j}`]}
                />
              );
            })
          )}
        </div>

        {/* Tier transition flash overlay */}
        <AnimatePresence>
          {tierFlash !== null && (
            <m.div
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

        <GridConnectorOverlay selectedCells={selectedCells} gridEl={gridRef.current} comboLevel={effectiveCombo} />

        {interactive && (
          <>
            <DragReleaseHint
              isDragging={isDragging}
              selectedCellCount={selectedCells.length}
              wordSubmitted={dragSubmitCount > 0}
            />
            {/* InputModeIndicator removed — overlaps grid tiles and confuses players */}
          </>
        )}
      </m.div>
    </div>
    </LazyMotion>
  );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;
