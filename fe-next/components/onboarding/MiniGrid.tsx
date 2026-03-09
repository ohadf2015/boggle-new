'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { WordPathTrail } from '@/components/animations/WordPathTrail';
import {
  type GridPosition,
  type SelectedCell,
  type ShakingCell,
  type GridMeasurements,
  getArrowDirection,
  ArrowComponents,
  areAdjacent,
  measureGridLayout,
  getCellAtTouchPosition,
} from './miniGridUtils';

interface MiniGridProps {
  size: 3 | 4;
  letters: string[][];
  demoWord: string;
  demoPath: GridPosition[];
  onDemoComplete: () => void;
  showHints?: boolean;
  autoTrace?: boolean;
  onAutoTraceComplete?: () => void;
  className?: string;
}

const MiniGrid: React.FC<MiniGridProps> = ({
  size,
  letters,
  demoWord,
  demoPath,
  onDemoComplete,
  showHints = true,
  autoTrace = false,
  onAutoTraceComplete,
  className,
}) => {
  const { t } = useLanguage();
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shakingCells, setShakingCells] = useState<ShakingCell[]>([]);
  const shakeIdRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);
  const isSelectingRef = useRef(false);
  const demoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasUserTouched, setHasUserTouched] = useState(false);
  const [hasTimePassed, setHasTimePassed] = useState(false);
  const [showTrail, setShowTrail] = useState(false);

  useEffect(() => { const timer = setTimeout(() => setHasTimePassed(true), 8000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (hasUserTouched && hasTimePassed) setShowTrail(true); }, [hasUserTouched, hasTimePassed]);
  useEffect(() => { return () => { if (demoCompleteTimeoutRef.current) clearTimeout(demoCompleteTimeoutRef.current); }; }, []);
  useEffect(() => { isSelectingRef.current = isSelecting; }, [isSelecting]);

  const measureGrid = useCallback((): GridMeasurements | null => {
    if (!gridRef.current) return null;
    const m = measureGridLayout(gridRef.current, letters, size);
    if (m) gridMeasurementsRef.current = m;
    return m;
  }, [letters, size]);
  const getCellAtPosition = useCallback((touchX: number, touchY: number): { row: number; col: number } | null => {
    if (!gridRef.current) return null;
    const cols = letters[0]?.length || size;
    const rows = letters.length;
    let measurements = gridMeasurementsRef.current;
    const now = performance.now();
    if (!measurements || now - measurements.timestamp > 500) {
      measurements = measureGrid();
      if (!measurements) return null;
    }
    return getCellAtTouchPosition(touchX, touchY, measurements, rows, cols);
  }, [letters, size, measureGrid]);
  const isCellSelected = useCallback((row: number, col: number): number | null => {
    const index = selectedCells.findIndex((c) => c.row === row && c.col === col);
    return index >= 0 ? index : null;
  }, [selectedCells]);
  const isNextCorrectCell = useCallback((row: number, col: number): boolean => {
    if (selectedCells.length >= demoPath.length) return false;
    const nextCell = demoPath[selectedCells.length];
    return nextCell.row === row && nextCell.col === col;
  }, [selectedCells, demoPath]);
  const triggerCellShake = useCallback((row: number, col: number) => {
    shakeIdRef.current += 1;
    const shakeCell: ShakingCell = { row, col, id: shakeIdRef.current };
    setShakingCells(prev => [...prev, shakeCell]);
    setTimeout(() => { setShakingCells(prev => prev.filter(c => c.id !== shakeCell.id)); }, 500);
    if (window.navigator?.vibrate) window.navigator.vibrate([30, 20, 30]);
  }, []);
  const isCellShaking = useCallback((row: number, col: number): boolean => {
    return shakingCells.some(c => c.row === row && c.col === col);
  }, [shakingCells]);

  const selectCell = useCallback(
    (row: number, col: number) => {
      if (showSuccess) return;

      const selectedIndex = isCellSelected(row, col);
      if (selectedIndex !== null) {
        if (selectedIndex === selectedCells.length - 1) {
          setSelectedCells(selectedCells.slice(0, -1));
          if (window.navigator?.vibrate) window.navigator.vibrate(5);
        }
        return;
      }

      if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        if (!areAdjacent(lastCell, { row, col })) {
          triggerCellShake(row, col);
          return;
        }
      }

      if (!isNextCorrectCell(row, col)) {
        triggerCellShake(row, col);
        return;
      }

      const newCell: SelectedCell = { row, col, letter: letters[row][col], index: selectedCells.length };
      const newSelectedCells = [...selectedCells, newCell];
      setSelectedCells(newSelectedCells);
      if (window.navigator?.vibrate) window.navigator.vibrate(12);

      if (newSelectedCells.length === demoPath.length) {
        const completedWord = newSelectedCells.map((c) => c.letter).join('');
        if (completedWord === demoWord) {
          setShowSuccess(true);
          if (demoCompleteTimeoutRef.current) clearTimeout(demoCompleteTimeoutRef.current);
          demoCompleteTimeoutRef.current = setTimeout(() => onDemoComplete(), 1500);
        }
      }
    },
    [selectedCells, letters, demoPath, demoWord, showSuccess, onDemoComplete, isCellSelected, isNextCorrectCell, triggerCellShake]
  );

  const handleCellTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelecting(true);
    isSelectingRef.current = true;
    setHasUserTouched(true);
    measureGrid();
    selectCell(row, col);
  };

  const handleGridTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (isSelectingRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    setIsSelecting(true);
    isSelectingRef.current = true;
    setHasUserTouched(true);
    measureGrid();
    const cell = getCellAtPosition(touch.clientX, touch.clientY);
    if (cell) selectCell(cell.row, cell.col);
  }, [getCellAtPosition, selectCell, measureGrid]);

  const processTouchMove = useCallback((touchX: number, touchY: number) => {
    if (!isSelectingRef.current) return;
    const cell = getCellAtPosition(touchX, touchY);
    if (cell) selectCell(cell.row, cell.col);
  }, [getCellAtPosition, selectCell]);

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsSelecting(false);
    isSelectingRef.current = false;
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    isSelectingRef.current = true;
    setHasUserTouched(true);
    measureGrid();
    selectCell(row, col);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelectingRef.current) return;
    processTouchMove(e.clientX, e.clientY);
  }, [processTouchMove]);

  const handleMouseUp = () => {
    setIsSelecting(false);
    isSelectingRef.current = false;
  };

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    const handleNativeTouchMove = (e: TouchEvent) => {
      if (!isSelectingRef.current) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (touch) processTouchMove(touch.clientX, touch.clientY);
    };
    element.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => element.removeEventListener('touchmove', handleNativeTouchMove);
  }, [processTouchMove]);

  useEffect(() => {
    const invalidateCache = () => { gridMeasurementsRef.current = null; };
    window.addEventListener('resize', invalidateCache);
    window.addEventListener('orientationchange', invalidateCache);
    return () => {
      window.removeEventListener('resize', invalidateCache);
      window.removeEventListener('orientationchange', invalidateCache);
    };
  }, []);

  // Auto-trace animation
  const [autoTraceIndex, setAutoTraceIndex] = useState(-1);
  useEffect(() => {
    if (!autoTrace) { setAutoTraceIndex(-1); return; }
    const delayPerCell = Math.floor(2000 / demoPath.length);
    const timers: ReturnType<typeof setTimeout>[] = [];
    demoPath.forEach((_, i) => {
      timers.push(setTimeout(() => setAutoTraceIndex(i), (i + 1) * delayPerCell));
    });
    timers.push(setTimeout(() => onAutoTraceComplete?.(), (demoPath.length + 1) * delayPerCell));
    return () => timers.forEach(clearTimeout);
  }, [autoTrace, demoPath, onAutoTraceComplete]);

  const nextHintCell = useMemo(() => {
    if (!showHints || selectedCells.length >= demoPath.length) return null;
    return demoPath[selectedCells.length];
  }, [showHints, selectedCells, demoPath]);

  const arrowDirection = useMemo(() => {
    if (!nextHintCell) return null;
    const lastSelected = selectedCells.length > 0 ? selectedCells[selectedCells.length - 1] : null;
    return getArrowDirection(lastSelected, nextHintCell);
  }, [nextHintCell, selectedCells]);

  const ArrowIcon = arrowDirection ? ArrowComponents[arrowDirection] : null;

  const pathPoints = useMemo(() => {
    if (!gridRef.current || selectedCells.length === 0) return [];
    const baseTimestamp = selectedCells.length * 1000;
    return selectedCells.map((cell) => {
      const cellElement = gridRef.current?.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
      if (!cellElement) {
        const measurements = gridMeasurementsRef.current || measureGrid();
        if (!measurements) return null;
        return {
          x: measurements.gridPaddingLeft + cell.col * measurements.cellWithGapWidth + measurements.cellWidth / 2,
          y: measurements.gridPaddingTop + cell.row * measurements.cellWithGapHeight + measurements.cellHeight / 2,
          timestamp: baseTimestamp + cell.index * 100,
        };
      }
      const rect = cellElement.getBoundingClientRect();
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (!gridRect) return null;
      return {
        x: rect.left + rect.width / 2 - gridRect.left,
        y: rect.top + rect.height / 2 - gridRect.top,
        timestamp: baseTimestamp + cell.index * 100,
      };
    }).filter((p): p is { x: number; y: number; timestamp: number } => p !== null);
  }, [selectedCells, measureGrid]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={gridRef}
        dir="ltr"
        className={cn(
          'grid gap-2 sm:gap-3 mx-auto relative',
          size === 3 ? 'grid-cols-3 max-w-[280px] sm:max-w-[340px]' : 'grid-cols-4 max-w-[360px] sm:max-w-[420px]'
        )}
        style={{ touchAction: 'none' }}
        onTouchStart={handleGridTouchStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        {letters.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const selectedIndex = isCellSelected(rowIndex, colIndex);
            const isSelected = selectedIndex !== null;
            const isHint = nextHintCell?.row === rowIndex && nextHintCell?.col === colIndex;
            const isShaking = isCellShaking(rowIndex, colIndex);

            const getAnimateState = () => {
              if (isShaking) {
                return {
                  x: [0, -8, 8, -6, 6, -4, 4, 0],
                  backgroundColor: ['rgb(255,107,107)', 'rgb(255,230,230)', 'rgb(255,107,107)'],
                };
              }
              if (isHint && !isSelected && selectedCells.length === 0) {
                return {
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 30px rgba(255,225,53,0.8), 0 0 60px rgba(255,225,53,0.5)',
                    '0 0 50px rgba(255,225,53,1), 0 0 80px rgba(255,225,53,0.7)',
                    '0 0 30px rgba(255,225,53,0.8), 0 0 60px rgba(255,225,53,0.5)',
                  ],
                };
              }
              if (isHint && !isSelected && selectedCells.length > 0) {
                return {
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 20px rgba(132,204,22,0.6), 0 0 40px rgba(132,204,22,0.3)',
                    '0 0 30px rgba(132,204,22,0.8), 0 0 60px rgba(132,204,22,0.5)',
                    '0 0 20px rgba(132,204,22,0.6), 0 0 40px rgba(132,204,22,0.3)',
                  ],
                };
              }
              return {};
            };

            const getTransition = () => {
              if (isShaking) return { duration: 0.4, ease: 'easeInOut' as const };
              if (isHint && !isSelected) return { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };
              return {};
            };

            return (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                data-row={rowIndex}
                data-col={colIndex}
                className={cn(
                  'relative aspect-square rounded-neo border-3 sm:border-4 border-neo-black',
                  'flex items-center justify-center font-black text-2xl sm:text-3xl text-neo-black',
                  'cursor-pointer select-none touch-none transition-colors',
                  'min-h-[80px] min-w-[80px] sm:min-h-[95px] sm:min-w-[95px]',
                  isSelected
                    ? 'bg-neo-lime shadow-hard-sm scale-95'
                    : 'letter-tile-gradient-cream shadow-hard-sm sm:shadow-hard',
                  isHint && !isSelected && selectedCells.length === 0 && 'ring-4 ring-neo-yellow bg-neo-yellow/20 shadow-[0_0_30px_rgba(255,225,53,0.8),0_0_60px_rgba(255,225,53,0.5)]',
                  isHint && !isSelected && selectedCells.length > 0 && 'ring-4 ring-neo-lime shadow-[0_0_20px_rgba(132,204,22,0.6),0_0_40px_rgba(132,204,22,0.3)]',
                  isShaking && 'border-neo-red'
                )}
                onTouchStart={(e) => handleCellTouchStart(e, rowIndex, colIndex)}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                whileHover={{ scale: isSelected ? 0.95 : 1.08 }}
                whileTap={{ scale: 0.9 }}
                animate={getAnimateState()}
                transition={getTransition()}
              >
                {letter}

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 w-6 h-6 sm:w-7 sm:h-7 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center text-xs sm:text-sm font-black shadow-hard-sm"
                    >
                      {selectedIndex + 1}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isHint && !isSelected && selectedCells.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: [1, 1.05, 1] }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }}
                      className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
                    >
                      <div className="bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo px-3 py-1.5 sm:px-4 sm:py-2 shadow-hard flex items-center gap-1.5">
                        <Hand className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" strokeWidth={2.5} />
                        <span className="font-black text-xs sm:text-sm uppercase tracking-wide">
                          {t('onboarding.welcome.startHere')}
                        </span>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-neo-black" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isHint && !isSelected && selectedCells.length > 0 && ArrowIcon && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: [0, -8, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ y: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } }}
                      className="absolute -top-8 sm:-top-10 left-1/2 -translate-x-1/2 z-10"
                    >
                      <div className="bg-neo-lime text-neo-black border-2 border-neo-black rounded-full p-1.5 sm:p-2 shadow-hard">
                        <ArrowIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Word preview */}
      <motion.div className="mt-4 sm:mt-6 text-center" dir="ltr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-1 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard">
          {demoWord.split('').map((targetLetter, i) => (
            <motion.span
              key={i}
              className={cn(
                'w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md border-2 border-neo-black font-black text-lg sm:text-xl',
                i < selectedCells.length ? 'bg-neo-lime text-neo-black' : 'bg-neo-black/10 text-neo-black/30'
              )}
              animate={i < selectedCells.length ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.2 }}
            >
              {i < selectedCells.length ? selectedCells[i].letter : targetLetter}
            </motion.span>
          ))}
        </div>
        <div className="text-xs sm:text-sm text-neo-black/60 mt-2 font-bold">
          {selectedCells.length}/{demoWord.length} letters selected
        </div>
      </motion.div>

      {/* Auto-trace overlay */}
      {autoTrace && autoTraceIndex >= 0 && (
        <div data-testid="auto-trace-overlay" className="absolute inset-0 pointer-events-none z-10">
          {demoPath.slice(0, autoTraceIndex + 1).map((pos, i) => (
            <motion.div
              key={`trace-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute w-6 h-6 bg-neo-pink rounded-full border-2 border-neo-black"
              style={{
                top: `${(pos.row / letters.length) * 100 + 50 / letters.length}%`,
                left: `${(pos.col / (letters[0]?.length || 3)) * 100 + 50 / (letters[0]?.length || 3)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      )}

      {/* Word trail */}
      {showTrail && pathPoints.length >= 2 && (
        <div className="absolute inset-0 pointer-events-none" data-testid="word-path-trail">
          <WordPathTrail points={pathPoints} isValid={selectedCells.length <= demoPath.length} showParticles showGlow />
        </div>
      )}

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-neo-black/20 rounded-neo backdrop-blur-sm z-20"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-neo-lime border-4 border-neo-black rounded-neo p-6 sm:p-8 shadow-hard-xl text-center"
            >
              <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 0.5, delay: 0.2 }} className="text-4xl sm:text-5xl mb-2">
                🎉
              </motion.div>
              <div className="text-2xl sm:text-3xl font-black text-neo-black mb-1">{t('onboarding.welcome.demoSuccess')}</div>
              <div className="text-sm sm:text-base font-bold text-neo-black/80">{t('onboarding.welcome.demoComplete')}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniGrid;
export type { GridPosition };
