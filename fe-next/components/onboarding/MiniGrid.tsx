'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { m, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { type GridPosition } from './miniGridUtils';

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

/** Spring configs for different juice moments */
const SPRING_BOUNCE = { type: 'spring' as const, stiffness: 600, damping: 18 };
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 500, damping: 25 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 22 };

/** Get center position of a cell for SVG line drawing */
function getCellCenter(row: number, col: number, cellSize: number, gap: number) {
  return {
    x: col * (cellSize + gap) + cellSize / 2,
    y: row * (cellSize + gap) + cellSize / 2,
  };
}

const MiniGrid: React.FC<MiniGridProps> = ({
  size,
  letters,
  demoWord,
  demoPath,
  onDemoComplete,
  showHints = true,
  autoTrace,
  onAutoTraceComplete,
  className,
}) => {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState<SelectedCell[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showStartHint, setShowStartHint] = useState(false);
  const [cellFlash, setCellFlash] = useState<string | null>(null);
  const isDragging = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<SelectedCell[]>([]);
  selectedRef.current = selected;

  // Animated progress value for the word bar
  const progressMotion = useMotionValue(0);
  const progressSpring = useSpring(progressMotion, { stiffness: 400, damping: 30 });
  const progressScale = useTransform(progressSpring, [0, 1], [1, 1.02]);

  // Update progress motion value
  useEffect(() => {
    progressMotion.set(selected.length / demoPath.length);
  }, [selected.length, demoPath.length, progressMotion]);

  // Auto-trace animation: show the path automatically first
  useEffect(() => {
    if (!autoTrace) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    demoPath.forEach((pos, i) => {
      timers.push(setTimeout(() => {
        setSelected(prev => [...prev, { row: pos.row, col: pos.col, letter: letters[pos.row][pos.col] }]);
        if (navigator?.vibrate) navigator.vibrate(8);
      }, 600 + i * 450));
    });
    // After showing full path, clear and hand off to user
    timers.push(setTimeout(() => {
      setSelected([]);
      onAutoTraceComplete?.();
    }, 600 + demoPath.length * 450 + 800));
    return () => timers.forEach(clearTimeout);
  }, [autoTrace, demoPath, letters, onAutoTraceComplete]);

  // Reset state when the target word changes (new word to trace)
  useEffect(() => {
    setSelected([]);
    setShowSuccess(false);
    setShowStartHint(false);
    setCellFlash(null);
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, [demoWord]);

  // Show "start here" hint after a delay
  useEffect(() => {
    if (!showHints || autoTrace) return undefined;
    const timer = setTimeout(() => setShowStartHint(true), 2000);
    return () => clearTimeout(timer);
  }, [showHints, autoTrace, demoWord]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  // Cell geometry for hit detection — snaps gap touches to nearest cell
  const getCellAt = useCallback((clientX: number, clientY: number): GridPosition | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // Allow a small overshoot beyond grid edges for fat-finger tolerance
    const margin = 12;
    if (x < -margin || y < -margin || x > rect.width + margin || y > rect.height + margin) return null;

    const cols = letters[0]?.length ?? size;
    const rows = letters.length;
    const gap = 8;
    const cellW = (rect.width - gap * (cols - 1)) / cols;
    const cellH = (rect.height - gap * (rows - 1)) / rows;
    const strideX = cellW + gap;
    const strideY = cellH + gap;

    // Clamp to grid bounds, then find nearest cell center
    const cx = Math.max(0, Math.min(x, rect.width));
    const cy = Math.max(0, Math.min(y, rect.height));
    const col = Math.min(cols - 1, Math.max(0, Math.round((cx - cellW / 2) / strideX)));
    const row = Math.min(rows - 1, Math.max(0, Math.round((cy - cellH / 2) / strideY)));

    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return { row, col };
  }, [letters, size]);

  const trySelect = useCallback((row: number, col: number) => {
    if (showSuccess || autoTrace) return;
    const sel = selectedRef.current;
    if (sel.length >= demoPath.length) return;

    // Ignore re-touch of already-selected cell (avoids double-advance on drag)
    const last = sel[sel.length - 1];
    if (last && last.row === row && last.col === col) return;

    // Only advance when touched cell matches the next expected path step
    const next = demoPath[sel.length];
    if (!next || next.row !== row || next.col !== col) return;

    setShowStartHint(false);
    setCellFlash(`${next.row}-${next.col}`);
    setTimeout(() => setCellFlash(null), 300);
    const newSel = [...sel, { row: next.row, col: next.col, letter: letters[next.row][next.col] }];
    setSelected(newSel);
    if (navigator?.vibrate) navigator.vibrate(12);

    if (newSel.length === demoPath.length) {
      setShowSuccess(true);
      if (navigator?.vibrate) navigator.vibrate([30, 50, 30, 50, 60]);
      successTimer.current = setTimeout(() => onDemoComplete(), 1200);
    }
  }, [showSuccess, autoTrace, demoPath, letters, onDemoComplete]);

  // Touch handlers with passive: false for smooth dragging
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

  const nextHint = showHints && !autoTrace && selected.length < demoPath.length
    ? demoPath[selected.length]
    : null;
  const progress = selected.length / demoPath.length;

  // SVG line path connecting selected cells
  const linePath = useMemo(() => {
    if (selected.length < 2) return '';
    // Approximate cell size based on grid max-width
    const approxGridW = size === 3 ? 300 : 360;
    const gap = 8;
    const cols = letters[0]?.length ?? size;
    const cellSize = (approxGridW - gap * (cols - 1)) / cols;
    return selected.map((cell, i) => {
      const { x, y } = getCellCenter(cell.row, cell.col, cellSize, gap);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [selected, size, letters]);

  const svgSize = useMemo(() => {
    const approxGridW = size === 3 ? 300 : 360;
    const gap = 8;
    const cols = letters[0]?.length ?? size;
    const rows = letters.length;
    const cellSize = (approxGridW - gap * (cols - 1)) / cols;
    return {
      width: cols * cellSize + (cols - 1) * gap,
      height: rows * cellSize + (rows - 1) * gap,
    };
  }, [size, letters]);

  return (
    <div className={cn('relative select-none', className)}>
      {/* SVG connection lines between selected cells */}
      {selected.length >= 2 && (
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
          style={{ width: '100%', height: 'auto', maxWidth: size === 3 ? 'min(300px,78vw)' : 'min(360px,85vw)', margin: '0 auto', display: 'block' }}
        >
          <m.path
            d={linePath}
            fill="none"
            stroke="#84CC16"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.6}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25 }}
          />
        </svg>
      )}

      {/* The grid */}
      <div
        ref={gridRef}
        dir="ltr"
        className={cn(
          'grid mx-auto w-full relative',
          size === 3
            ? 'grid-cols-3 max-w-[min(300px,78vw)] gap-[8px]'
            : 'grid-cols-4 max-w-[min(360px,85vw)] gap-[8px]'
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
            const cellKey = `${ri}-${ci}`;
            const selIdx = selected.findIndex(c => c.row === ri && c.col === ci);
            const isSel = selIdx !== -1;
            const isHint = nextHint?.row === ri && nextHint?.col === ci;
            const isFlashing = cellFlash === cellKey;
            const isFirstHint = isHint && showStartHint && selected.length === 0;

            return (
              <m.div
                key={cellKey}
                className={cn(
                  'relative aspect-square rounded-neo border-3',
                  'flex items-center justify-center font-black text-3xl sm:text-4xl',
                  'pointer-events-none cursor-grab active:cursor-grabbing',
                  'transition-colors duration-100',
                  isSel
                    ? 'bg-neo-lime border-neo-black text-neo-black'
                    : 'letter-tile-gradient-cream border-neo-black text-neo-black shadow-hard-sm',
                  isHint && !isSel && 'border-neo-yellow ring-2 ring-neo-yellow/60',
                  isFlashing && 'bg-neo-lime/80'
                )}
                layout
                animate={
                  isSel
                    ? { scale: 0.92, y: 1, transition: SPRING_SNAPPY }
                    : isHint && !isSel
                    ? { scale: [1, 1.08, 1], transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } }
                    : { scale: 1, y: 0, transition: SPRING_SOFT }
                }
                whileHover={!isSel ? { scale: 1.04, transition: { duration: 0.15 } } : undefined}
              >
                {/* Glow ring when selected */}
                {isSel && (
                  <m.div
                    className="absolute inset-[-4px] rounded-neo border-2 border-neo-lime/40"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.4, 0.7, 0.4], scale: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ boxShadow: '0 0 16px rgba(132,204,22,0.5), inset 0 0 8px rgba(132,204,22,0.2)' }}
                  />
                )}

                {/* Letter with pop animation */}
                <m.span
                  className="relative z-10"
                  animate={isSel ? { scale: [1, 1.15, 1.05] } : { scale: 1 }}
                  transition={isSel ? { scale: { type: 'tween', duration: 0.4, ease: 'easeOut' } } : SPRING_BOUNCE}
                >
                  {letter}
                </m.span>

                {/* Selection order badge — juicy pop-in */}
                <AnimatePresence>
                  {isSel && (
                    <m.div
                      initial={{ scale: 0, rotate: -120, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, rotate: 90, opacity: 0 }}
                      transition={SPRING_BOUNCE}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-neo-yellow border-2 border-neo-black rounded-full flex items-center justify-center text-[11px] font-black shadow-hard-sm pointer-events-none z-20"
                    >
                      {selIdx + 1}
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Pulsing "Start here" finger pointer */}
                <AnimatePresence>
                  {isFirstHint && (
                    <m.div
                      initial={{ opacity: 0, y: 8, scale: 0.8 }}
                      animate={{ opacity: 1, y: [0, -4, 0], scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.8 }}
                      transition={{
                        y: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 },
                      }}
                      className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 pointer-events-none"
                    >
                      <div className="bg-neo-yellow text-neo-black border-2 border-neo-black rounded-neo px-2.5 py-1 shadow-hard-sm text-[10px] font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {t('onboarding.welcome.startHere')}
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neo-yellow border-b-2 border-r-2 border-neo-black rotate-45" />
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            );
          })
        )}
      </div>

      {/* Word preview bar with animated progress */}
      <m.div
        className="mt-5 text-center"
        dir={language === 'he' ? 'rtl' : 'ltr'}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...SPRING_SOFT }}
        style={{ scale: progressScale }}
      >
        <div className="inline-flex items-center gap-3 bg-neo-navy/90 backdrop-blur-xs text-neo-white border-3 border-neo-white/50 rounded-neo px-5 py-3 shadow-hard relative overflow-hidden">
          {/* Animated progress fill */}
          <m.div
            className="absolute inset-0 bg-neo-lime/25 origin-left"
            animate={{ scaleX: progress }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          {demoWord.split('').map((targetLetter, i) => {
            const filled = i < selected.length;
            return (
              <m.span
                key={`mini-letter-${i}-${targetLetter}`}
                className={cn(
                  'relative z-10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-md font-black text-xl sm:text-2xl',
                  filled
                    ? 'bg-neo-lime text-neo-black border-2 border-neo-black shadow-hard-sm'
                    : 'bg-neo-white/20 text-neo-white border-2 border-neo-white/40'
                )}
                animate={filled ? { scale: [0.7, 1.2, 1], rotate: [0, -5, 0] } : { scale: 1 }}
                transition={filled ? SPRING_BOUNCE : undefined}
              >
                {filled ? selected[i].letter : targetLetter}
              </m.span>
            );
          })}

          {/* Success checkmark with celebration burst */}
          <AnimatePresence>
            {showSuccess && (
              <m.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                className="relative z-10 ms-1 w-9 h-9 sm:w-10 sm:h-10 bg-neo-lime border-3 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
              >
                <Check className="w-5 h-5 text-neo-black" strokeWidth={3} />
                {/* Mini celebration particles */}
                {[...Array(6)].map((_, i) => (
                  <m.div
                    key={`burst-${i}`}
                    className="absolute w-1.5 h-1.5 rounded-full bg-neo-yellow"
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos((i * Math.PI * 2) / 6) * 24,
                      y: Math.sin((i * Math.PI * 2) / 6) * 24,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                  />
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Letter count with animated opacity */}
        <m.p
          className="text-xs text-neo-white font-bold mt-2"
          animate={{ opacity: selected.length > 0 ? 1 : 0.6 }}
          transition={{ duration: 0.2 }}
        >
          {selected.length}/{demoWord.length}
        </m.p>
      </m.div>
    </div>
  );
};

export default MiniGrid;
export type { GridPosition };
