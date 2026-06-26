'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Route } from 'lucide-react';
import { getDemoConfig } from '../onboarding/demoConfigs';
import { NeoPanel } from '@/components/ui/panel';

const AUTO_DISMISS_MS = 8000; // 8 seconds - longer for interactive demo

interface DirectionGuidanceTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  t: (key: string) => string;
  dir?: 'ltr' | 'rtl';
  /** Locale for the example word/grid. Defaults to 'en'. */
  language?: string;
}

/**
 * DirectionGuidanceTooltip - Shows when player only uses straight-line directions
 *
 * Interactive demo showing that words can change direction mid-path.
 * Features a mini animated grid that traces a zigzag path.
 */
const DirectionGuidanceTooltip = memo<DirectionGuidanceTooltipProps>(
  ({ isVisible, onDismiss, t, dir = 'ltr', language = 'en' }) => {
    const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isPopping, setIsPopping] = useState(false);

    // Locale-aware example: 3x3 grid with L-shape path (right + down) showing
    // direction-change. Reuses the vetted demoConfigs vocabulary.
    const { letters: DEMO_GRID, path: demoPathCfg, word: DEMO_WORD } = useMemo(
      () => getDemoConfig(language),
      [language],
    );
    const DEMO_PATH = useMemo<[number, number][]>(
      () => demoPathCfg.map(p => [p.row, p.col] as [number, number]),
      [demoPathCfg],
    );

    // Handle dismiss with pop animation
    const handleDismiss = useCallback(() => {
      setIsPopping(true);
      // Let animation play before actual dismiss
      setTimeout(onDismiss, 300);
    }, [onDismiss]);

    // Animate the demo path
    const animatePath = useCallback(() => {
      if (isAnimating) return;

      setIsAnimating(true);
      setShowSuccess(false);
      setSelectedCells([]);

      // Animate each cell selection with delay
      DEMO_PATH.forEach((cell, index) => {
        setTimeout(() => {
          setSelectedCells((prev) => [...prev, cell]);
        }, index * 400);
      });

      // Show success after path completes
      setTimeout(
        () => {
          setShowSuccess(true);

          // Reset and replay after showing success
          setTimeout(() => {
            setSelectedCells([]);
            setShowSuccess(false);
            setIsAnimating(false);
          }, 1500);
        },
        DEMO_PATH.length * 400 + 300
      );
    }, [isAnimating, DEMO_PATH]);

    // Auto-start animation when visible
    useEffect(() => {
      if (!isVisible) {
        setSelectedCells([]);
        setShowSuccess(false);
        setIsAnimating(false);
        return;
      }

      // Start first animation
      const startTimer = setTimeout(animatePath, 500);

      return () => clearTimeout(startTimer);
    }, [isVisible, animatePath]);

    // Loop animation
    useEffect(() => {
      if (!isVisible || isAnimating) return;

      const loopTimer = setTimeout(animatePath, 800);
      return () => clearTimeout(loopTimer);
    }, [isVisible, isAnimating, animatePath]);

    // Auto-dismiss
    useEffect(() => {
      if (!isVisible) return;

      const dismissTimer = setTimeout(handleDismiss, AUTO_DISMISS_MS);
      return () => clearTimeout(dismissTimer);
    }, [isVisible, handleDismiss]);

    // Reset popping state when tooltip becomes visible again
    useEffect(() => {
      if (isVisible) {
        setIsPopping(false);
      }
    }, [isVisible]);

    const isCellSelected = (row: number, col: number): boolean => {
      return selectedCells.some(([r, c]) => r === row && c === col);
    };

    const getCellIndex = (row: number, col: number): number => {
      return selectedCells.findIndex(([r, c]) => r === row && c === col);
    };

    // Calculate SVG line coordinates
    const cellSize = 40;
    const gap = 4;
    const getCenter = (index: number): number => index * (cellSize + gap) + cellSize / 2;

    return (
      <AnimatePresence>
        {isVisible && (
          <m.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={isPopping
              ? { opacity: 0, scale: 1.15, y: -20 }
              : { opacity: 1, y: 0, scale: 1 }
            }
            exit={{ opacity: 0, scale: 0, y: -30 }}
            transition={isPopping
              ? { duration: 0.25, ease: [0.36, 1.2, 0.5, 1] }
              : { type: 'spring', stiffness: 300, damping: 25 }
            }
            className="fixed bottom-[calc(6rem+var(--admob-banner-height,0px))] left-1/2 -translate-x-1/2 z-50 pointer-events-auto safe-area-bottom"
          >
            <NeoPanel
              tone="cream"
              shadow="lg"
              radius="neo-lg"
              className="text-neo-black px-4 py-3 max-w-[340px] relative cursor-pointer hover:shadow-hard-xl transition-shadow active:scale-[0.98]"
              onClick={handleDismiss}
              role="tooltip"
              aria-live="polite"
            >
              {/* Close button */}
              <button type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="
                  absolute -top-2 -right-2 w-6 h-6
                  bg-neo-pink text-white rounded-full
                  border-2 border-neo-black shadow-hard-sm
                  flex items-center justify-center
                  hover:scale-110 transition-transform
                "
                aria-label={t('common.close')}
              >
                <X className="w-3 h-3" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-linear-to-br from-neo-pink to-neo-pink rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                  <Route className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-black text-neo-black text-sm uppercase tracking-wide">
                  {t('guidance.directionPattern.title')}
                </h4>
              </div>

              {/* Description */}
              <p className="text-neo-black/80 text-xs leading-relaxed mb-3">
                {t('guidance.directionPattern.text') ||
                  'You can change directions while tracing a word! Go right, then down, then diagonal - all in one word.'}
              </p>

              {/* Interactive Demo Grid */}
              <div className="flex flex-col items-center gap-2">
                {/* Force LTR for consistent SVG line positioning regardless of document direction */}
                <div dir="ltr" className="relative p-2 bg-neo-navy/5 rounded-lg border-2 border-neo-black/20">
                  {/* Grid */}
                  <div
                    className="grid grid-cols-3"
                    style={{ gap: `${gap}px` }}
                  >
                    {DEMO_GRID.map((row, rowIndex) =>
                      row.map((letter, colIndex) => {
                        const isSelected = isCellSelected(rowIndex, colIndex);
                        const cellIndex = getCellIndex(rowIndex, colIndex);

                        return (
                          <m.div
                            key={`${rowIndex}-${colIndex}`}
                            className={`
                              flex items-center justify-center relative
                              text-sm font-black uppercase
                              rounded-lg border-2 border-neo-black
                              select-none
                              ${
                                isSelected
                                  ? 'bg-neo-lime text-neo-black shadow-[0_0_12px_rgba(255,235,59,0.6)] z-10'
                                  : 'bg-white text-neo-black shadow-hard-sm'
                              }
                            `}
                            style={{ width: cellSize, height: cellSize }}
                            animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 20,
                            }}
                          >
                            {letter}
                            {isSelected && cellIndex >= 0 && (
                              <m.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute -top-1 ${dir === 'rtl' ? '-left-1' : '-right-1'} w-4 h-4 bg-neo-pink text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-neo-black`}
                              >
                                {cellIndex + 1}
                              </m.span>
                            )}
                          </m.div>
                        );
                      })
                    )}
                  </div>

                  {/* Connection Lines SVG Overlay */}
                  {selectedCells.length > 1 && (
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        width: 3 * cellSize + 2 * gap + 16,
                        height: 3 * cellSize + 2 * gap + 16,
                        top: 0,
                        left: 0,
                      }}
                    >
                      <g transform="translate(8, 8)">
                        {selectedCells.slice(1).map((cell, i) => {
                          const prev = selectedCells[i];
                          if (!prev) return null;

                          const x1 = getCenter(prev[1]);
                          const y1 = getCenter(prev[0]);
                          const x2 = getCenter(cell[1]);
                          const y2 = getCenter(cell[0]);

                          return (
                            <m.line
                              key={`line-${i}-${cell[0]}-${cell[1]}`}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="#FF6B9D"
                              strokeWidth="3"
                              strokeLinecap="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            />
                          );
                        })}
                      </g>
                    </svg>
                  )}
                </div>

                {/* Word display */}
                <m.div
                  className={`
                    px-3 py-1 rounded-lg border-2 border-neo-black
                    font-black text-sm tracking-wider
                    ${showSuccess ? 'bg-neo-lime text-neo-black' : 'bg-white text-neo-black'}
                  `}
                  animate={showSuccess ? { scale: [1, 1.1, 1] } : {}}
                >
                  {selectedCells.length > 0
                    ? selectedCells
                        .map(([r, c]) => DEMO_GRID[r]?.[c] ?? '')
                        .join('')
                    : DEMO_WORD}
                  {showSuccess && ' ✓'}
                </m.div>
              </div>

              {/* Tap to dismiss - more prominent with pulse animation */}
              <m.div
                className="flex items-center justify-center gap-1.5 mt-3 py-1.5 px-3 mx-auto w-fit
                  bg-neo-black/5 rounded-full border border-neo-black/20"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-[11px] font-semibold text-neo-black/70 uppercase tracking-wide">
                  {t('common.tapToDismiss')}
                </span>
                <m.span
                  className="text-neo-pink"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <X className="w-3 h-3" />
                </m.span>
              </m.div>

              {/* Progress bar */}
              <m.div
                className="absolute bottom-0 left-0 h-1 bg-neo-pink/40 rounded-b-lg"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </NeoPanel>
          </m.div>
        )}
      </AnimatePresence>
    );
  }
);

DirectionGuidanceTooltip.displayName = 'DirectionGuidanceTooltip';

export default DirectionGuidanceTooltip;
