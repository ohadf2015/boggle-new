'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { type GridPosition } from './miniGridUtils';
import MiniGridCell from './MiniGridCell';
import MiniGridWordBar from './MiniGridWordBar';
import styles from './MiniGrid.module.css';

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

  // SVG geometry — the board is at most 300px (3x3) / 360px (4x4) wide.
  const geometry = useMemo(() => {
    const approxGridW = size === 3 ? 300 : 360;
    const gap = 8;
    const cols = letters[0]?.length ?? size;
    const rows = letters.length;
    const cellSize = (approxGridW - gap * (cols - 1)) / cols;
    return {
      cellSize,
      gap,
      width: cols * cellSize + (cols - 1) * gap,
      height: rows * cellSize + (rows - 1) * gap,
    };
  }, [size, letters]);

  // Settled path (all but the newest link) + the newest link, which draws in.
  const { settledPath, newestLink } = useMemo(() => {
    const pts = selected.map((c) => getCellCenter(c.row, c.col, geometry.cellSize, geometry.gap));
    const toD = (list: typeof pts) => list.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return {
      settledPath: pts.length >= 3 ? toD(pts.slice(0, -1)) : '',
      newestLink: pts.length >= 2 ? toD(pts.slice(-2)) : '',
    };
  }, [selected, geometry]);

  return (
    <div className={cn('relative select-none', className)}>
      {/* SVG connection lines between selected cells */}
      {selected.length >= 2 && (
        <svg
          data-testid="mini-grid-path"
          className="absolute inset-0 pointer-events-none z-10"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          style={{ width: '100%', height: 'auto', maxWidth: size === 3 ? 'min(300px,78vw)' : 'min(360px,85vw)', margin: '0 auto', display: 'block' }}
        >
          <g fill="none" stroke="#84CC16" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6}>
            {settledPath && <path d={settledPath} />}
            <path key={selected.length} d={newestLink} pathLength={1} className={styles.segment} />
          </g>
        </svg>
      )}

      {/* The grid */}
      <div
        ref={gridRef}
        data-testid="mini-grid-board"
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
            const isHint = selIdx === -1 && nextHint?.row === ri && nextHint?.col === ci;
            return (
              <MiniGridCell
                key={cellKey}
                cellKey={cellKey}
                letter={letter}
                order={selIdx === -1 ? null : selIdx + 1}
                isHint={isHint}
                isFlashing={cellFlash === cellKey}
                showStartHint={isHint && showStartHint && selected.length === 0}
                startHereLabel={t('onboarding.welcome.startHere')}
              />
            );
          })
        )}
      </div>

      <MiniGridWordBar
        demoWord={demoWord}
        filledLetters={selected.map((c) => c.letter)}
        showSuccess={showSuccess}
        dir={language === 'he' ? 'rtl' : 'ltr'}
      />
    </div>
  );
};

export default MiniGrid;
export type { GridPosition };
