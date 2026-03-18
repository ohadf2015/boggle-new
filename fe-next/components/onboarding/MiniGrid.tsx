'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { type GridPosition, areAdjacent } from './miniGridUtils';

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

interface SelectedCell extends GridPosition {
  letter: string;
}

const MiniGrid: React.FC<MiniGridProps> = ({
  size,
  letters,
  demoWord,
  demoPath,
  onDemoComplete,
  showHints = true,
  className,
}) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<SelectedCell[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shakeCell, setShakeCell] = useState<string | null>(null);
  const [showStartHint, setShowStartHint] = useState(false);
  const isDragging = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<SelectedCell[]>([]);
  selectedRef.current = selected;

  useEffect(() => {
    if (!showHints) return undefined;
    const timer = setTimeout(() => setShowStartHint(true), 2500);
    return () => clearTimeout(timer);
  }, [showHints]);

  useEffect(() => {
    return () => { if (successTimer.current) clearTimeout(successTimer.current); };
  }, []);

  const getCellAt = useCallback((clientX: number, clientY: number): GridPosition | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    const cols = letters[0]?.length ?? size;
    const rows = letters.length;
    const gap = 8;
    const cellW = (rect.width - gap * (cols - 1)) / cols;
    const cellH = (rect.height - gap * (rows - 1)) / rows;
    const col = Math.floor(x / (cellW + gap));
    const row = Math.floor(y / (cellH + gap));

    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    const cellLeft = col * (cellW + gap);
    const cellTop = row * (cellH + gap);
    if (x > cellLeft + cellW || y > cellTop + cellH) return null;

    return { row, col };
  }, [letters, size]);

  const trySelect = useCallback((row: number, col: number) => {
    if (showSuccess) return;
    const sel = selectedRef.current;

    const idx = sel.findIndex(c => c.row === row && c.col === col);
    if (idx !== -1) {
      if (idx === sel.length - 1) setSelected(sel.slice(0, -1));
      return;
    }

    if (sel.length > 0 && !areAdjacent(sel[sel.length - 1], { row, col })) {
      setShakeCell(`${row}-${col}`);
      setTimeout(() => setShakeCell(null), 400);
      if (navigator?.vibrate) navigator.vibrate([20, 15, 20]);
      return;
    }

    const next = demoPath[sel.length];
    if (!next || next.row !== row || next.col !== col) {
      setShakeCell(`${row}-${col}`);
      setTimeout(() => setShakeCell(null), 400);
      if (navigator?.vibrate) navigator.vibrate([20, 15, 20]);
      return;
    }

    setShowStartHint(false);
    const newSel = [...sel, { row, col, letter: letters[row][col] }];
    setSelected(newSel);
    if (navigator?.vibrate) navigator.vibrate(10);

    if (newSel.length === demoPath.length) {
      setShowSuccess(true);
      if (navigator?.vibrate) navigator.vibrate([30, 50, 30, 50, 60]);
      successTimer.current = setTimeout(() => onDemoComplete(), 1200);
    }
  }, [showSuccess, demoPath, letters, onDemoComplete]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const touch = e.touches[0];
    if (touch) {
      const cell = getCellAt(touch.clientX, touch.clientY);
      if (cell) trySelect(cell.row, cell.col);
    }
  }, [getCellAt, trySelect]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const cell = getCellAt(touch.clientX, touch.clientY);
        if (cell) trySelect(cell.row, cell.col);
      }
    };
    grid.addEventListener('touchmove', onMove, { passive: false });
    return () => grid.removeEventListener('touchmove', onMove);
  }, [getCellAt, trySelect]);

  const handleTouchEnd = useCallback(() => { isDragging.current = false; }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell) trySelect(cell.row, cell.col);
  }, [getCellAt, trySelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell) trySelect(cell.row, cell.col);
  }, [getCellAt, trySelect]);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const nextHint = showHints && selected.length < demoPath.length ? demoPath[selected.length] : null;
  const progress = selected.length / demoPath.length;

  return (
    <div className={cn('relative', className)}>
      <div
        ref={gridRef}
        dir="ltr"
        className={cn(
          'grid gap-2 mx-auto w-full',
          size === 3 ? 'grid-cols-3 max-w-[min(260px,65vw)]' : 'grid-cols-4 max-w-[min(320px,75vw)]'
        )}
        style={{ touchAction: 'none', userSelect: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {letters.map((row, ri) =>
          row.map((letter, ci) => {
            const selIdx = selected.findIndex(c => c.row === ri && c.col === ci);
            const isSel = selIdx !== -1;
            const isHint = nextHint?.row === ri && nextHint?.col === ci;
            const isShaking = shakeCell === `${ri}-${ci}`;
            const isFirstHint = isHint && showStartHint && selected.length === 0;

            return (
              <motion.div
                key={`${ri}-${ci}`}
                className={cn(
                  'relative aspect-square rounded-neo border-3 border-neo-black',
                  'flex items-center justify-center font-black text-2xl sm:text-3xl text-neo-black',
                  'pointer-events-none',
                  isShaking && 'border-red-500 bg-red-200',
                  isSel
                    ? 'bg-neo-lime shadow-[0_0_16px_rgba(132,204,22,0.6)] border-neo-lime'
                    : 'letter-tile-gradient-cream shadow-hard-sm',
                  isHint && !isSel && 'ring-2 ring-neo-yellow shadow-[0_0_20px_rgba(255,225,53,0.6)]'
                )}
                animate={
                  isShaking
                    ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.35 } }
                    : isSel
                    ? { scale: 0.9, transition: { type: 'spring', stiffness: 500, damping: 25 } }
                    : isHint && !isSel
                    ? { scale: [1, 1.06, 1], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } }
                    : { scale: 1 }
                }
              >
                <span className={cn(
                  'transition-transform duration-150',
                  isSel && 'scale-110'
                )}>
                  {letter}
                </span>

                {/* Selection order badge — juicy pop-in */}
                <AnimatePresence>
                  {isSel && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neo-yellow border-2 border-neo-black rounded-full flex items-center justify-center text-[10px] font-black shadow-hard-xs pointer-events-none"
                    >
                      {selIdx + 1}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pulsing "Start here" hint */}
                <AnimatePresence>
                  {isFirstHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: [0, -3, 0] }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ y: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10 pointer-events-none"
                    >
                      <div className="bg-neo-yellow text-neo-black border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-[10px] font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {t('onboarding.welcome.startHere')}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Word preview with progress feel */}
      <motion.div
        className="mt-4 text-center"
        dir="ltr"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="inline-flex items-center gap-1.5 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo px-3 py-2 shadow-hard relative overflow-hidden">
          {/* Progress bar behind letters */}
          <motion.div
            className="absolute inset-0 bg-neo-lime/20 origin-left"
            animate={{ scaleX: progress }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          {demoWord.split('').map((targetLetter, i) => {
            const filled = i < selected.length;
            return (
              <motion.span
                key={i}
                className={cn(
                  'relative z-10 w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-md border-2 font-black text-base sm:text-lg',
                  filled
                    ? 'bg-neo-lime text-neo-black border-neo-black'
                    : 'bg-neo-black/5 text-neo-black/25 border-neo-black/20'
                )}
                animate={filled ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.25, type: 'spring', stiffness: 500 }}
              >
                {filled ? selected[i].letter : targetLetter}
              </motion.span>
            );
          })}

          {/* Success checkmark with celebration */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="relative z-10 ml-1 w-8 h-8 sm:w-9 sm:h-9 bg-neo-lime border-3 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-neo-black" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Letter count */}
        <motion.p
          className="text-xs text-neo-white/50 font-bold mt-1.5"
          animate={selected.length > 0 ? { opacity: 1 } : { opacity: 0.4 }}
        >
          {selected.length}/{demoWord.length}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default MiniGrid;
export type { GridPosition };
