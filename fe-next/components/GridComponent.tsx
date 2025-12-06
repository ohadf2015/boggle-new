import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { LetterGrid, GridPosition } from '@/types';

// Import extracted utilities
import {
  getComboColors,
  getHeatMapStyle,
  useGridInteraction,
  getPerformanceMode,
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
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('full');
  const gridRef = useRef<HTMLDivElement>(null);

  // Use extracted interaction hook
  const {
    selectedCells,
    fadingCells,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
  } = useGridInteraction({
    grid,
    interactive,
    comboLevel,
    onWordSubmit,
    externalSelectedCells,
    gridRef,
  });

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
      {/* Combo Indicator - Jumps through screen like GO animation */}
      <AnimatePresence mode="wait">
        {comboLevel > 0 && comboColors.text && (
          <motion.div
            key={`combo-${comboLevel}`}
            initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{
              scale: [0, 1.5, 1.2],
              opacity: comboColors.flicker ? [0, 1, 0.7, 1, 0.8, 1, 0] : [0, 1, 0],
              x: ['-50%', '-50%', '-50%'],
              y: ['-50%', '-50%', '-150%']
            }}
            exit={{
              scale: 0,
              opacity: 0,
              transition: { duration: 0.1 }
            }}
            transition={{
              duration: comboColors.flicker ? 1.2 : 0.8,
              times: comboColors.flicker ? [0, 0.2, 0.3, 0.5, 0.7, 0.9, 1] : [0, 0.4, 1],
              ease: "easeOut"
            }}
            className="fixed top-1/2 left-1/2 z-50 pointer-events-none"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              className={cn(
                "px-6 py-3 rounded-full font-extrabold text-3xl md:text-4xl text-white backdrop-blur-sm",
                !comboColors.isRainbow && `bg-gradient-to-r`,
                comboColors.shadow,
                "border-4 border-white/40"
              )}
              animate={comboColors.flicker ? {
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              } : {}}
              transition={comboColors.flicker ? {
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              } : {}}
              style={{
                filter: comboColors.isRainbow
                  ? 'drop-shadow(0 0 30px rgba(255, 255, 255, 1))'
                  : 'drop-shadow(0 0 20px rgba(251, 146, 60, 0.8))',
                ...(comboColors.isRainbow && {
                  background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                  backgroundSize: '300% 100%',
                  animation: 'rainbow-shift 1.5s linear infinite'
                })
              }}
            >
              {comboColors.isRainbow ? '🌈' : '🔥'} {comboColors.text}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEO-BRUTALIST: Clean frame wrapper */}
      <div className="game-board-frame relative">
        {/* Inner grid container */}
        <div
          ref={gridRef}
          dir="ltr"
          className={cn(
            "grid touch-none select-none relative rounded-neo w-full h-full",
            isLargeGrid ? "gap-1 sm:gap-1" : "gap-1 sm:gap-1.5",
            "bg-neo-cream border-2 border-neo-black/20",
            className
          )}
          style={{
            gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${grid.length || 4}, minmax(0, 1fr))`,
            backgroundImage: 'var(--halftone-pattern)',
            backgroundColor: 'var(--neo-cream)',
            ['--cell-font-size' as string]: `calc((100cqw / ${grid[0]?.length || 4}) * ${largeText ? 0.55 : 0.50})`,
            containerType: 'size',
          }}
          role="grid"
          aria-label="Letter grid"
          tabIndex={interactive ? 0 : -1}
          onTouchMove={handleTouchMove as unknown as React.TouchEventHandler}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
        >
          {grid.map((row, i) =>
            row.map((cell, j) => {
              const isSelected = selectedCells.some(c => c.row === i && c.col === j);
              const firstSelected = selectedCells[0];
              const isFirstSelected = firstSelected !== undefined && firstSelected.row === i && firstSelected.col === j;
              const isFading = fadingCells.some(c => c.row === i && c.col === j);
              const heatStyle = getHeatMapStyle(i, j, heatMapData);

              return (
                <motion.div
                  key={`${i}-${j}`}
                  data-row={i}
                  data-col={j}
                  data-letter={cell}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`Letter ${cell}`}
                  tabIndex={interactive ? 0 : -1}
                  onTouchStart={(e) => handleTouchStart(i, j, cell, e)}
                  onMouseDown={(e) => handleMouseDown(i, j, cell, e)}
                  initial={animateOnMount
                    ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
                    : { scale: 0.8, opacity: 0 }
                  }
                  animate={{
                    scale: isSelected ? 1.08 : (isFading ? 1.04 : 1),
                    opacity: 1,
                    rotate: reduceMotion ? 0 : ((isSelected || isFading) ? [0, -5, 5, 0] : 0),
                    rotateX: 0,
                    y: isSelected ? -2 : 0
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    duration: reduceMotion
                      ? 0.1
                      : (animateOnMount && !isSelected
                        ? 0.5
                        : (isSelected ? 0.12 : 0.6)),
                    ease: animateOnMount ? [0.34, 1.56, 0.64, 1] : "easeOut",
                    delay: reduceMotion ? 0 : (animateOnMount ? (i + j) * 0.04 : 0),
                    scale: isSelected ? { type: "spring", stiffness: reduceMotion ? 200 : 350, damping: reduceMotion ? 30 : 22 } : undefined
                  }}
                  className={cn(
                    "aspect-square flex items-center justify-center font-black cursor-pointer relative overflow-hidden",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan",
                    isSelected
                      ? comboColors.isRainbow
                        ? `${comboColors.textColor || 'text-neo-black'} ${comboColors.border} z-10 ${comboColors.shadow}`
                        : `${comboColors.bg} ${comboColors.textColor || 'text-neo-black'} border-3 ${comboColors.border} z-10 ${comboColors.shadow}`
                      : "bg-neo-white text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed",
                    "transition-all",
                    comboLevel > 0 ? "duration-300" : "duration-100"
                  )}
                  style={{
                    borderRadius: '4px',
                    fontSize: 'var(--cell-font-size)',
                    ...(isSelected && comboColors.isRainbow ? {
                      background: 'linear-gradient(135deg, #FF3366, #FF6B35, #FFE135, #BFFF00, #00FFFF, #FF1493, #4a1c6a)',
                      backgroundSize: '400% 400%',
                      animation: comboColors.strobe
                        ? (comboColors.intenseStrobe ? 'rainbow-cell 0.8s ease infinite, strobe-intense 0.12s infinite alternate' : 'rainbow-cell 1.2s ease infinite, strobe-light 0.2s infinite alternate')
                        : 'rainbow-cell 1.5s ease infinite'
                    } : isSelected && comboColors.flicker ? {
                      animation: 'flicker 0.12s infinite alternate'
                    } : {})
                  }}
                >
                  {/* Ripple effect on selection */}
                  {isSelected && (
                    <>
                      <motion.div
                        className="absolute inset-0 bg-white/40"
                        style={{ borderRadius: '8px' }}
                        initial={{ scale: 0.5, opacity: 0.8 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9), transparent 70%)',
                          filter: 'blur(2px)',
                          borderRadius: '8px'
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 1.5, 0], opacity: [1, 0.5, 0] }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />

                      {/* Fire effects - performance optimized */}
                      {isFirstSelected && !reduceMotion && performanceMode !== 'minimal' && (
                        <>
                          {[...Array(performanceMode === 'full' ? 8 : 4)].map((_, idx) => {
                            const particleCount = performanceMode === 'full' ? 8 : 4;
                            const angle = (idx * (360 / particleCount)) * (Math.PI / 180);
                            const distance = 25 + (idx % 2) * 5;
                            return (
                              <motion.div
                                key={`first-burst-${idx}`}
                                className="absolute w-3 h-3 rounded-full pointer-events-none"
                                style={{
                                  background: idx % 3 === 0
                                    ? 'radial-gradient(circle, #ffff00, #ff6b00)'
                                    : idx % 3 === 1
                                    ? 'radial-gradient(circle, #ff6b00, #ff0000)'
                                    : 'radial-gradient(circle, #ff9500, #ff5500)',
                                  left: '50%',
                                  top: '50%',
                                  marginLeft: '-6px',
                                  marginTop: '-6px',
                                  boxShadow: performanceMode === 'full' ? '0 0 8px rgba(255, 107, 0, 0.8)' : 'none'
                                }}
                                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                animate={{
                                  scale: [1, 2, 0],
                                  opacity: [1, 0.9, 0],
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance
                                }}
                                transition={{
                                  duration: 0.6,
                                  ease: "easeOut",
                                  delay: idx * 0.02
                                }}
                              />
                            );
                          })}
                        </>
                      )}

                      {/* Center burst particles */}
                      {!reduceMotion && performanceMode !== 'minimal' && (
                        <>
                          {[...Array(performanceMode === 'full' ? 6 : 4)].map((_, idx) => {
                            const count = performanceMode === 'full' ? 6 : 4;
                            const angle = (idx * (360 / count)) * (Math.PI / 180);
                            const distance = 15 + (comboLevel * 3);
                            return (
                              <motion.div
                                key={`burst-${idx}`}
                                className="absolute w-2 h-2 rounded-full pointer-events-none"
                                style={{
                                  background: comboLevel > 0
                                    ? 'radial-gradient(circle, #ff6b00, #ff0000)'
                                    : 'radial-gradient(circle, #fbbf24, #f97316)',
                                  left: '50%',
                                  top: '50%',
                                  marginLeft: '-4px',
                                  marginTop: '-4px'
                                }}
                                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                animate={{
                                  scale: [0.5, 1.5, 0],
                                  opacity: [1, 0.8, 0],
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: "easeOut",
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
