'use client';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Hand } from 'lucide-react';
import { getDemoConfig } from '../onboarding/demoConfigs';

const AUTO_DISMISS_MS = 8000; // 8 seconds

interface SwipeTipTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  t: (key: string) => string;
  dir?: 'ltr' | 'rtl';
  /** Locale for example word/grid. Defaults to 'en'. */
  language?: string;
}

/**
 * SwipeTipTooltip - Shows when player hasn't submitted any words after 15 seconds
 *
 * Interactive demo showing how to swipe to form words.
 * Features a mini animated grid that traces a swipe path with finger indicator.
 */
const SwipeTipTooltip = memo<SwipeTipTooltipProps>(
  ({ isVisible, onDismiss, t, dir = 'ltr', language = 'en' }) => {
    const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [fingerPosition, setFingerPosition] = useState<{ x: number; y: number } | null>(null);
    const [isPopping, setIsPopping] = useState(false);
    const timerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    // Locale-aware example: 3x3 grid with vetted demo word per language.
    // Reuses the shared demoConfigs vocabulary. RTL grid is the LTR letters
    // mirrored column-wise so the same path coords visually swipe RTL.
    const isRTL = dir === 'rtl';
    const baseDemo = useMemo(() => getDemoConfig(language), [language]);
    const DEMO_GRID = useMemo(
      () => (isRTL ? baseDemo.letters.map(row => [...row].reverse()) : baseDemo.letters),
      [baseDemo, isRTL],
    );
    const DEMO_PATH = useMemo<[number, number][]>(
      () => baseDemo.path.map(p => [p.row, isRTL ? (DEMO_GRID[0].length - 1 - p.col) : p.col] as [number, number]),
      [baseDemo, isRTL, DEMO_GRID],
    );
    const DEMO_WORD = baseDemo.word;

    const scheduleTimer = useCallback((cb: () => void, delay: number) => {
      const id = setTimeout(() => {
        timerIdsRef.current.delete(id);
        cb();
      }, delay);
      timerIdsRef.current.add(id);
      return id;
    }, []);

    // Clear all pending timeouts on unmount
    useEffect(() => {
      const timerIds = timerIdsRef.current;
      return () => {
        timerIds.forEach(id => clearTimeout(id));
        timerIds.clear();
      };
    }, []);

    // Handle dismiss with pop animation
    const handleDismiss = useCallback(() => {
      setIsPopping(true);
      // Let animation play before actual dismiss
      scheduleTimer(onDismiss, 300);
    }, [onDismiss, scheduleTimer]);

    const cellSize = 36;
    const gap = 3;
    const getCenter = (index: number): number => index * (cellSize + gap) + cellSize / 2;

    // Animate the demo swipe path with finger
    const animatePath = useCallback(() => {
      if (isAnimating) return;

      setIsAnimating(true);
      setShowSuccess(false);
      setSelectedCells([]);
      setFingerPosition(null);

      // Animate each cell selection with delay and finger movement
      DEMO_PATH.forEach((cell, index) => {
        scheduleTimer(() => {
          setSelectedCells((prev) => [...prev, cell]);
          // Position finger at current cell
          setFingerPosition({
            x: getCenter(cell[1]),
            y: getCenter(cell[0]),
          });
        }, index * 350);
      });

      // Show success after path completes
      scheduleTimer(
        () => {
          setShowSuccess(true);
          setFingerPosition(null); // Hide finger on success

          // Reset and replay after showing success
          scheduleTimer(() => {
            setSelectedCells([]);
            setShowSuccess(false);
            setIsAnimating(false);
          }, 1500);
        },
        DEMO_PATH.length * 350 + 300
      );
    }, [isAnimating, DEMO_PATH, scheduleTimer]);

    // Auto-start animation when visible
    useEffect(() => {
      if (!isVisible) {
        setSelectedCells([]);
        setShowSuccess(false);
        setIsAnimating(false);
        setFingerPosition(null);
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
            <div
              className="
                bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo-lg shadow-hard-lg
                px-4 py-3 max-w-[320px] relative cursor-pointer
                hover:shadow-hard-xl transition-shadow active:scale-[0.98]
              "
              onClick={handleDismiss}
              role="tooltip"
              aria-live="polite"
            >
              {/* Close button */}
              <button
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
                <div className="w-8 h-8 bg-linear-to-br from-neo-cyan to-neo-lime rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                  <Hand className="w-4 h-4 text-neo-black" />
                </div>
                <h4 className="font-black text-neo-black text-sm uppercase tracking-wide">
                  {t('guidance.swipeTip.title')}
                </h4>
              </div>

              {/* Description */}
              <p className="text-neo-black/80 text-xs leading-relaxed mb-3">
                {t('guidance.swipeTip.text') ||
                  'Drag your finger across letters to form words. Connect adjacent letters in any direction!'}
              </p>

              {/* Interactive Demo Grid */}
              <div className="flex flex-col items-center gap-2">
                {/* Force LTR for consistent SVG line positioning regardless of document direction */}
                <div dir="ltr" className="relative p-2 bg-neo-navy/5 rounded-lg border-2 border-neo-black/20">
                  {/* Grid */}
                  <div
                    className="grid grid-cols-3 relative"
                    style={{ gap: `${gap}px` }}
                  >
                    {DEMO_GRID.map((row, rowIndex) =>
                      row.map((letter, colIndex) => {
                        const isSelected = isCellSelected(rowIndex, colIndex);

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
                          </m.div>
                        );
                      })
                    )}

                    {/* Finger indicator */}
                    {fingerPosition && (
                      <m.div
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: fingerPosition.x + 8 - 12,
                          top: fingerPosition.y + 8 - 8,
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="w-6 h-6 text-neo-pink drop-shadow-lg">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.5 2.5a2.5 2.5 0 00-2.5 2.5v8.5a.5.5 0 01-1 0V8a2 2 0 10-4 0v9a7 7 0 0014 0v-6a2 2 0 00-4 0v2.5a.5.5 0 01-1 0V5a2.5 2.5 0 00-2.5-2.5z"/>
                          </svg>
                        </div>
                      </m.div>
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
                              key={`${x1}-${y1}-${x2}-${y2}`}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="#00D4AA"
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
                  className="text-neo-cyan"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <X className="w-3 h-3" />
                </m.span>
              </m.div>

              {/* Progress bar */}
              <m.div
                className="absolute bottom-0 left-0 h-1 bg-neo-cyan/40 rounded-b-lg"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    );
  }
);

SwipeTipTooltip.displayName = 'SwipeTipTooltip';

export default SwipeTipTooltip;
