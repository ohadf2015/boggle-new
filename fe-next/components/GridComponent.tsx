import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { LetterGrid, GridPosition } from '@/types';

// Import extracted utilities
import {
  getComboColors,
  getHeatMapStyle,
  useGridInteraction,
  getPerformanceMode,
  ComboIndicator,
  ComboExplanationTooltip,
  type SelectedCell,
  type HeatMapData,
  type PerformanceMode,
} from './grid';

interface GridComponentProps {
  grid: LetterGrid;
  interactive?: boolean;
  onWordSubmit?: (word: string) => void;
  selectedCells?: SelectedCell[];
  className?: string;
  largeText?: boolean;
  comboLevel?: number;
  animateOnMount?: boolean;
  heatMapData?: HeatMapData | null;
  fireRoundActive?: boolean;
  earthquakeShaking?: boolean;
}

/**
 * GridComponent - Interactive letter grid for word game
 * Memoized to prevent unnecessary re-renders
 *
 * REFACTORED: Core logic extracted to components/grid/:
 * - comboColors.ts - Combo level color schemes
 * - heatMap.ts - Heat map overlay calculations
 * - useGridInteraction.ts - Touch/mouse interaction logic
 * - performanceUtils.ts - Device capability detection
 */
const GridComponent = memo<GridComponentProps>(({
  grid,
  interactive = false,
  onWordSubmit,
  selectedCells: externalSelectedCells,
  className,
  largeText = false,
  comboLevel = 0,
  animateOnMount = false,
  heatMapData = null,
  fireRoundActive = false,
  earthquakeShaking = false,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('full');
  const gridRef = useRef<HTMLDivElement>(null);

  // Use extracted interaction hook
  const {
    selectedCells,
    fadingCells,
    focusedCell,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleKeyDown,
  } = useGridInteraction({
    grid,
    interactive,
    comboLevel,
    onWordSubmit,
    externalSelectedCells,
    gridRef,
    fireRoundActive,
  });

  // Calculate the word being formed from selected cells
  const formedWord = useMemo(() => {
    return selectedCells.map(c => c.letter).join('');
  }, [selectedCells]);

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

  // Fire Round: Random glowing cells with rainbow cycling
  const [glowingCells, setGlowingCells] = useState<Set<string>>(new Set());
  const [cellColorIndices, setCellColorIndices] = useState<Map<string, number>>(new Map());

  // Rainbow colors for dance floor effect
  const RAINBOW_COLORS = [
    '#FF1493', // Deep Pink
    '#FF6B35', // Orange
    '#FFD700', // Gold
    '#00FF00', // Lime
    '#00FFFF', // Cyan
    '#8B5CF6', // Purple
    '#FF3366', // Hot Pink
  ];

  // Randomize glowing cells when fire round is active (optimized for performance)
  useEffect(() => {
    if (!fireRoundActive) {
      setGlowingCells(new Set());
      setCellColorIndices(new Map());
      return;
    }

    let animationFrameId: number;
    let lastUpdate = 0;
    const updateInterval = 300; // Very fast: 300ms for dance floor effect
    const MAX_GLOW_CELLS = 8; // More cells for better dance floor coverage

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
  }, [fireRoundActive, grid]);

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

  const isLargeGrid = (grid[0]?.length || 0) > 8;
  const comboColors = getComboColors(comboLevel);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
      {/* ARIA live region for screen reader announcements of word being formed */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {interactive && formedWord.length > 0 ? `Current word: ${formedWord}, ${selectedCells.length} letters` : ''}
      </div>

      {/* Word Preview - Fixed at top of screen, doesn't affect grid layout */}
      <AnimatePresence>
        {interactive && selectedCells.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            aria-hidden="true"
          >
            <div className="bg-neo-cyan border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard flex items-center gap-2 whitespace-nowrap">
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

      {/* Combo Indicator - New juicy animation with particles and glow */}
      <ComboIndicator comboLevel={comboLevel} reduceMotion={reduceMotion} />

      {/* First-time combo explanation tooltip */}
      <ComboExplanationTooltip comboLevel={comboLevel} />

      {/* NEO-BRUTALIST: Clean frame wrapper */}
      <div className="game-board-frame relative">

        {/* Inner grid container */}
        <div
          ref={gridRef}
          dir="ltr"
          className={cn(
            "grid touch-none select-none relative rounded-neo w-full h-full",
            isLargeGrid ? "gap-1 sm:gap-1" : "gap-1.5 sm:gap-2",
            "bg-neo-cream border-2 border-neo-black/20",
            earthquakeShaking && "earthquake-shake",
            className
          )}
          style={{
            gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${grid.length || 4}, minmax(0, 1fr))`,
            backgroundImage: 'var(--halftone-pattern)',
            backgroundColor: 'var(--neo-cream)',
            ['--cell-font-size' as string]: `calc((100cqw / ${grid[0]?.length || 4}) * ${largeText ? 0.70 : 0.50})`,
            containerType: 'size',
          }}
          role="grid"
          aria-label="Letter grid"
          tabIndex={interactive ? 0 : -1}
          onTouchMove={handleTouchMove as unknown as React.TouchEventHandler}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
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
              const heatStyle = getHeatMapStyle(i, j, heatMapData);
              const isAdjacentHint = adjacentHintCells.has(cellKey);
              const isGlowing = glowingCells.has(cellKey);
              const glowColorIndex = cellColorIndices.get(cellKey) ?? 0;
              const glowColor = RAINBOW_COLORS[glowColorIndex];

              // Individual shake physics for each letter during earthquake
              const shakeOffset = earthquakeShaking ? {
                x: (Math.random() - 0.5) * 150,
                y: (Math.random() - 0.5) * 150,
                rotate: (Math.random() - 0.5) * 360,
                scale: 0.8 + Math.random() * 0.4,
              } : { x: 0, y: 0, rotate: 0, scale: 1 };

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
                  initial={animateOnMount
                    ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
                    : false
                  }
                  animate={earthquakeShaking ? {
                    // Brutal shake: letters fly in random directions
                    x: shakeOffset.x,
                    y: shakeOffset.y,
                    rotate: shakeOffset.rotate,
                    scale: shakeOffset.scale,
                    opacity: 0.7,
                  } : {
                    scale: isSelected ? 1.05 : (isFading ? 1.02 : 1),
                    opacity: 1,
                    rotate: reduceMotion ? 0 : (isSelected ? [0, -1.5, 1.5, 0] : 0),
                    rotateX: 0,
                    y: isSelected ? -2 : 0,
                    x: 0,
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={earthquakeShaking ? {
                    // Chaotic flying motion during shake
                    type: 'spring',
                    stiffness: 50,
                    damping: 8,
                    mass: 0.5,
                  } : {
                    // Elastic snap-back after shake or normal animation
                    duration: reduceMotion
                      ? 0.08
                      : (animateOnMount && !isSelected
                        ? 0.4
                        : (isSelected ? 0.15 : 0.12)),
                    ease: "easeInOut",
                    delay: reduceMotion ? 0 : (animateOnMount ? (i + j) * 0.03 : 0),
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                  className={cn(
                    "aspect-square flex items-center justify-center font-black cursor-pointer relative overflow-hidden",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan",
                    isSelected
                      ? comboColors.isRainbow
                        ? `${comboColors.textColor || 'text-neo-black'} ${comboColors.border} z-10 ${comboColors.shadow}`
                        : `${comboColors.bg} ${comboColors.textColor || 'text-neo-black'} border-3 ${comboColors.border} z-10 ${comboColors.shadow}`
                      : "bg-neo-white text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed",
                    // Adjacent cell hint - subtle glow indicating valid next selection
                    isAdjacentHint && !isSelected && "ring-2 ring-neo-yellow/70 ring-offset-1 ring-offset-neo-cream",
                    // Keyboard focus indicator
                    isFocused && !isSelected && "ring-4 ring-neo-cyan ring-offset-2 ring-offset-neo-cream z-20",
                    // Transition controls (no longer using fire-glow CSS class)
                    "transition-all",
                    comboLevel > 0 ? "duration-300" : "duration-100"
                  )}
                  style={{
                    borderRadius: '6px',
                    fontSize: 'var(--cell-font-size)',
                    // Rainbow dance floor effect during fire round (no solid fill)
                    ...(isGlowing && fireRoundActive && !isSelected && {
                      background: glowColor,
                      boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}80, 4px 4px 0 #000`,
                      animation: 'rainbow-pulse 0.6s ease-in-out infinite',
                      willChange: 'transform, box-shadow',
                    }),
                    // Dynamic glow based on combo level
                    ...(isSelected && {
                      boxShadow: comboColors.isRainbow
                        ? '0 0 20px rgba(255, 51, 102, 0.6), 0 0 40px rgba(0, 255, 255, 0.4), 6px 6px 0 #000'
                        : comboLevel >= 5
                        ? '0 0 15px rgba(255, 107, 53, 0.7), 0 0 30px rgba(255, 51, 102, 0.4), 5px 5px 0 #000'
                        : comboLevel >= 3
                        ? '0 0 12px rgba(255, 107, 53, 0.5), 4px 4px 0 #000'
                        : '0 0 8px rgba(255, 200, 100, 0.4), 4px 4px 0 #000',
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
                  {/* Ripple effect on selection */}
                  {isSelected && (
                    <>
                      {/* Primary ripple */}
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          borderRadius: '6px',
                          background: comboLevel >= 5
                            ? 'radial-gradient(circle, rgba(255,107,53,0.5), transparent 70%)'
                            : 'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)',
                        }}
                        initial={{ scale: 0.3, opacity: 1 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                      {/* Secondary glow pulse */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: comboColors.isRainbow
                            ? 'radial-gradient(circle at center, rgba(255, 51, 102, 0.8), rgba(0, 255, 255, 0.4) 50%, transparent 70%)'
                            : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9), transparent 60%)',
                          filter: 'blur(3px)',
                          borderRadius: '6px'
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 1.3, 1.5], opacity: [1, 0.6, 0] }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                      {/* Combo level glow ring */}
                      {comboLevel >= 3 && !reduceMotion && (
                        <motion.div
                          className="absolute inset-[-4px] pointer-events-none"
                          style={{
                            borderRadius: '10px',
                            border: comboColors.isRainbow
                              ? '2px solid rgba(255, 51, 102, 0.8)'
                              : '2px solid rgba(255, 107, 53, 0.6)',
                            boxShadow: comboColors.isRainbow
                              ? '0 0 10px rgba(255, 51, 102, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.3)'
                              : '0 0 8px rgba(255, 107, 53, 0.4)',
                          }}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: [0.9, 1.1, 1], opacity: [0, 1, 0.6] }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      )}

                      {/* Sparkle burst - first letter gets extra flair */}
                      {isFirstSelected && !reduceMotion && performanceMode !== 'minimal' && (
                        <>
                          {[...Array(performanceMode === 'full' ? 10 : 6)].map((_, idx) => {
                            const particleCount = performanceMode === 'full' ? 10 : 6;
                            const angle = (idx * (360 / particleCount) + (idx % 2) * 15) * (Math.PI / 180);
                            const distance = 28 + (idx % 3) * 8;
                            const colors = comboColors.isRainbow
                              ? ['#FF3366', '#FFE135', '#00FFFF', '#FF1493', '#BFFF00']
                              : ['#FFD700', '#FF6B35', '#FF3366', '#FFA500'];
                            return (
                              <motion.div
                                key={`first-burst-${idx}`}
                                className="absolute pointer-events-none"
                                style={{
                                  width: 6 + (idx % 2) * 2,
                                  height: 6 + (idx % 2) * 2,
                                  background: colors[idx % colors.length],
                                  borderRadius: idx % 2 === 0 ? '50%' : '2px',
                                  left: '50%',
                                  top: '50%',
                                  marginLeft: -3 - (idx % 2),
                                  marginTop: -3 - (idx % 2),
                                  boxShadow: `0 0 6px ${colors[idx % colors.length]}`,
                                  transform: `rotate(${idx * 45}deg)`,
                                }}
                                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                animate={{
                                  scale: [0, 1.5, 1, 0],
                                  opacity: [0, 1, 0.8, 0],
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance,
                                  rotate: [0, 180, 360],
                                }}
                                transition={{
                                  duration: 0.5,
                                  ease: [0.25, 0.46, 0.45, 0.94],
                                  delay: idx * 0.025
                                }}
                              />
                            );
                          })}
                        </>
                      )}

                      {/* Center burst particles - scale with combo */}
                      {!reduceMotion && performanceMode !== 'minimal' && (
                        <>
                          {[...Array(performanceMode === 'full' ? 8 : 5)].map((_, idx) => {
                            const count = performanceMode === 'full' ? 8 : 5;
                            const angle = (idx * (360 / count) + 22.5) * (Math.PI / 180);
                            const distance = 12 + Math.min(comboLevel * 2.5, 20);
                            const particleColor = comboColors.isRainbow
                              ? ['#FF1493', '#00FFFF', '#FFE135'][idx % 3]
                              : comboLevel >= 5
                              ? '#FF3366'
                              : comboLevel >= 3
                              ? '#FF6B35'
                              : '#FFA500';
                            return (
                              <motion.div
                                key={`burst-${idx}`}
                                className="absolute rounded-full pointer-events-none"
                                style={{
                                  width: 5,
                                  height: 5,
                                  background: particleColor,
                                  left: '50%',
                                  top: '50%',
                                  marginLeft: -2.5,
                                  marginTop: -2.5,
                                  boxShadow: `0 0 4px ${particleColor}`,
                                }}
                                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                animate={{
                                  scale: [0, 1.2, 0.8, 0],
                                  opacity: [0, 1, 0.7, 0],
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: [0.25, 0.46, 0.45, 0.94],
                                  delay: idx * 0.02
                                }}
                              />
                            );
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* Heat map glow overlay */}
                  {heatStyle && (
                    <>
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          inset: '-50%',
                          background: `radial-gradient(circle, rgba(${heatStyle.r}, ${heatStyle.g}, ${heatStyle.b}, ${0.5 + heatStyle.t * 0.3}) 0%, rgba(${heatStyle.r}, ${heatStyle.g}, ${heatStyle.b}, 0.1) 50%, transparent 70%)`,
                          filter: `blur(${8 + heatStyle.t * 12}px)`,
                          zIndex: 5
                        }}
                      />
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          inset: '-20%',
                          background: `radial-gradient(circle, rgba(${heatStyle.r}, ${heatStyle.g}, ${heatStyle.b}, ${0.6 + heatStyle.t * 0.35}) 0%, rgba(${heatStyle.r}, ${heatStyle.g}, ${heatStyle.b}, 0.2) 60%, transparent 80%)`,
                          filter: `blur(${3 + heatStyle.t * 5}px)`,
                          zIndex: 6
                        }}
                      />
                      {heatStyle.t > 0.5 && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            inset: '10%',
                            background: `radial-gradient(circle, rgba(255, ${Math.round(200 + heatStyle.t * 55)}, ${Math.round(heatStyle.t * 200)}, ${0.4 + heatStyle.t * 0.4}) 0%, transparent 70%)`,
                            filter: `blur(${2 + heatStyle.t * 3}px)`,
                            zIndex: 7
                          }}
                        />
                      )}
                    </>
                  )}
                  {cell}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;
