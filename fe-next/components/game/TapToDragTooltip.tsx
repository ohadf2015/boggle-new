'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Hand } from 'lucide-react';
import { NeoPanel } from '@/components/ui/panel';

const AUTO_DISMISS_MS = 4000; // 4 seconds (faster)

// Drag path: Top-left -> Top-right -> Bottom-right (L-shape swipe)
const DEMO_PATH: [number, number][] = [
  [0, 0], // C
  [0, 1], // A
  [1, 1], // T (changed to make L-shape)
];

interface TapToDragTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  t: (key: string) => string;
  dir?: 'ltr' | 'rtl';
  language?: string;
}

// Language-specific demo grids — only the 5 supported locales.
// Hebrew uses vetted vocabulary from tutorialBoardConfig (כלב = "dog").
// Japanese uses romaji because the live Word Hunt board is romaji on `ja`.
const LANGUAGE_GRIDS: Record<string, string[][]> = {
  en: [['C', 'A'], ['T', 'S']], // CATS
  he: [['כ', 'ל'], ['ב', 'י']], // כלב (dog)
  sv: [['K', 'A'], ['T', 'T']], // KATT (cat)
  ja: [['C', 'A'], ['T', 'S']], // CATS (romaji per project convention)
  es: [['G', 'A'], ['T', 'O']], // GATO (cat)
};

/**
 * TapToDragTooltip - Shows when player taps a single letter without dragging
 *
 * Compact interactive demo showing how to drag to form words.
 * Appears immediately on single tap detection to teach the mechanic.
 */
const TapToDragTooltip = memo<TapToDragTooltipProps>(
  ({ isVisible, onDismiss, t, dir = 'ltr', language = 'en' }) => {
    const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [fingerPosition, setFingerPosition] = useState<{ x: number; y: number } | null>(null);
    const [isPopping, setIsPopping] = useState(false);

    // Handle dismiss with pop animation
    const handleDismiss = useCallback(() => {
      setIsPopping(true);
      setTimeout(onDismiss, 250);
    }, [onDismiss]);

    const isRTL = dir === 'rtl';
    const cellSize = 28; // Smaller cells
    const gap = 2;
    const getCenter = (index: number): number => index * (cellSize + gap) + cellSize / 2;

    // Get the actual path based on direction
    const getPath = useCallback(() => {
      if (isRTL) {
        // Reverse column indices for RTL (2x2 grid)
        return DEMO_PATH.map(([row, col]) => [row, 1 - col] as [number, number]);
      }
      return DEMO_PATH;
    }, [isRTL]);

    // Animate the demo swipe path with finger
    const animatePath = useCallback(() => {
      if (isAnimating) return;

      setIsAnimating(true);
      setSelectedCells([]);
      setFingerPosition(null);

      const path = getPath();

      // Animate each cell selection with delay and finger movement
      path.forEach((cell, index) => {
        setTimeout(() => {
          setSelectedCells((prev) => [...prev, cell]);
          setFingerPosition({
            x: getCenter(cell[1]),
            y: getCenter(cell[0]),
          });
        }, index * 300);
      });

      // Reset and replay after showing complete path
      setTimeout(
        () => {
          setSelectedCells([]);
          setFingerPosition(null);
          setIsAnimating(false);
        },
        path.length * 300 + 800
      );
    }, [isAnimating, getPath]);

    // Auto-start animation when visible
    useEffect(() => {
      if (!isVisible) {
        setSelectedCells([]);
        setIsAnimating(false);
        setFingerPosition(null);
        return;
      }

      const startTimer = setTimeout(animatePath, 400);
      return () => clearTimeout(startTimer);
    }, [isVisible, animatePath]);

    // Loop animation
    useEffect(() => {
      if (!isVisible || isAnimating) return;

      const loopTimer = setTimeout(animatePath, 600);
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

    // Get grid for display (language-specific, mirror for RTL)
    const baseGrid = LANGUAGE_GRIDS[language] || LANGUAGE_GRIDS['en'];
    const displayGrid = isRTL
      ? baseGrid.map(row => [...row].reverse())
      : baseGrid;

    return (
      <AnimatePresence>
        {isVisible && (
          <m.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={isPopping
              ? { opacity: 0, scale: 1.05, x: 10 }
              : { opacity: 1, x: 0, scale: 1 }
            }
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            transition={isPopping
              ? { duration: 0.2, ease: [0.36, 1.2, 0.5, 1] }
              : { type: 'spring', stiffness: 350, damping: 28 }
            }
            className="fixed top-20 right-4 z-40 pointer-events-auto"
          >
            <NeoPanel
              tone="cream"
              shadow="lg"
              radius="neo-lg"
              className="text-neo-black px-3 py-2.5 w-[200px] relative cursor-pointer hover:shadow-hard-xl transition-shadow active:scale-[0.98]"
              onClick={handleDismiss}
              role="tooltip"
              aria-live="polite"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="
                  absolute -top-1.5 -right-1.5 w-5 h-5
                  bg-neo-pink text-white rounded-full
                  border-2 border-neo-black shadow-hard-sm
                  flex items-center justify-center
                  hover:scale-110 transition-transform
                "
                aria-label={t('common.close')}
              >
                <X className="w-2.5 h-2.5" />
              </button>

              {/* Compact Header */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <m.div
                  className="w-6 h-6 bg-linear-to-br from-neo-cyan to-neo-lime rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Hand className="w-3 h-3 text-neo-black" />
                </m.div>
                <h4 className="font-black text-neo-black text-xs uppercase tracking-wide">
                  {t('guidance.dragTutorial.title')}
                </h4>
              </div>

              {/* Interactive Demo Grid */}
              <div className="flex justify-center">
                {/* Force LTR for consistent SVG line positioning */}
                <div dir="ltr" className="relative p-1 bg-neo-navy/5 rounded-lg border border-neo-black/20">
                  <div
                    className="grid grid-cols-2 relative"
                    style={{ gap: `${gap}px` }}
                  >
                    {displayGrid.map((row, rowIndex) =>
                      row.map((letter, colIndex) => {
                        const isSelected = isCellSelected(rowIndex, colIndex);

                        return (
                          <m.div
                            key={`${rowIndex}-${colIndex}`}
                            className={`
                              flex items-center justify-center relative
                              text-xs font-black uppercase
                              rounded-md border-2 border-neo-black
                              select-none
                              ${
                                isSelected
                                  ? 'bg-neo-lime text-neo-black shadow-[0_0_8px_rgba(255,235,59,0.5)] z-10'
                                  : 'bg-white text-neo-black shadow-hard-sm'
                              }
                            `}
                            style={{ width: cellSize, height: cellSize }}
                            animate={isSelected ? { scale: 1.08 } : { scale: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 450,
                              damping: 22,
                            }}
                          >
                            {letter}
                          </m.div>
                        );
                      })
                    )}

                    {/* Finger indicator with pulse */}
                    {fingerPosition && (
                      <m.div
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: fingerPosition.x + 4 - 10,
                          top: fingerPosition.y + 4 - 6,
                        }}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{
                          opacity: 1,
                          scale: [1, 1.15, 1],
                        }}
                        transition={{
                          opacity: { duration: 0.12 },
                          scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                        }}
                      >
                        <div className="w-5 h-5 text-neo-pink drop-shadow-md">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.5 2.5a2.5 2.5 0 00-2.5 2.5v8.5a.5.5 0 01-1 0V8a2 2 0 10-4 0v9a7 7 0 0014 0v-6a2 2 0 00-4 0v2.5a.5.5 0 01-1 0V5a2.5 2.5 0 00-2.5-2.5z"/>
                          </svg>
                        </div>
                        {/* Glow effect */}
                        <m.div
                          className="absolute inset-0 w-5 h-5 bg-neo-pink rounded-full blur-xs -z-10"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </m.div>
                    )}
                  </div>

                  {/* Connection Lines SVG Overlay */}
                  {selectedCells.length > 1 && (
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        width: 2 * cellSize + 1 * gap + 8,
                        height: 2 * cellSize + 1 * gap + 8,
                        top: 0,
                        left: 0,
                      }}
                    >
                      <g transform="translate(4, 4)">
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
                              stroke="#00D4AA"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 0.12 }}
                            />
                          );
                        })}
                      </g>
                    </svg>
                  )}
                </div>
              </div>

              {/* Progress bar for auto-dismiss */}
              <m.div
                className="absolute bottom-0 left-0 h-0.5 bg-neo-cyan/50 rounded-b-lg"
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

TapToDragTooltip.displayName = 'TapToDragTooltip';

export default TapToDragTooltip;
