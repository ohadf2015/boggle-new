'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGridInteraction } from '@/components/grid/useGridInteraction';
import type { LetterGrid } from '@/types';
import { buildTrailPath, trailHeadPoint, RELEASE_HOLD_MS, type TrailPoint } from './huntTrail';

export interface HuntBoardProps {
  grid: LetterGrid;
  isGameOver: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: Array<{ row: number; col: number }>;
  t: (key: string) => string;
}

type Center = { row: number; col: number; x: number; y: number };

/**
 * Word Hunt board. Same input contract as the shared GridComponent (drag, tap,
 * double-click submit), with its own presentation: the in-progress word sits
 * big above the grid, a trail runs through the selected tiles from a head disc
 * on the first tile, and the trail holds briefly after release.
 */
export const HuntBoard: React.FC<HuntBoardProps> = ({
  grid,
  isGameOver,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  highlightedPath,
  t: _t,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  const [released, setReleased] = useState<TrailPoint[] | null>(null);

  const {
    selectedCells,
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
    interactive: !isGameOver,
    comboLevel: 0,
    onWordSubmit,
    gridRef,
    disableLetterKeyInput: true,
  });

  const formedWord = useMemo(() => selectedCells.map((c) => c.letter).join(''), [selectedCells]);

  useEffect(() => {
    onWordChange(formedWord, selectedCells.length);
    // onWordChange identity changes every render; only the word matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formedWord]);

  const measure = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const board = el.getBoundingClientRect();
    setBoardSize({ w: board.width, h: board.height });
    const next: Center[] = [];
    el.querySelectorAll<HTMLElement>('[data-row][data-col]').forEach((cell) => {
      const r = cell.getBoundingClientRect();
      next.push({
        row: Number(cell.dataset.row),
        col: Number(cell.dataset.col),
        x: r.left - board.left + r.width / 2,
        y: r.top - board.top + r.height / 2,
      });
    });
    setCenters(next);
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [grid, measure]);

  const trail = useMemo<TrailPoint[]>(() => {
    const byKey = new Map(centers.map((c) => [`${c.row},${c.col}`, c]));
    return selectedCells
      .map((c) => byKey.get(`${c.row},${c.col}`))
      .filter((c): c is Center => Boolean(c));
  }, [centers, selectedCells]);

  const lastTrailRef = useRef<TrailPoint[]>([]);
  useEffect(() => {
    if (trail.length > 0) {
      lastTrailRef.current = trail;
      setReleased(null);
      return;
    }
    if (lastTrailRef.current.length >= 2) {
      const held = lastTrailRef.current;
      lastTrailRef.current = [];
      setReleased(held);
      const id = setTimeout(() => setReleased(null), RELEASE_HOLD_MS);
      return () => clearTimeout(id);
    }
  }, [trail]);

  const shownTrail = trail.length > 0 ? trail : released ?? [];
  const head = trailHeadPoint(shownTrail);
  const selectedKeys = useMemo(
    () => new Set(selectedCells.map((c) => `${c.row},${c.col}`)),
    [selectedCells],
  );
  const hintKeys = useMemo(
    () => new Set((highlightedPath ?? []).map((c) => `${c.row},${c.col}`)),
    [highlightedPath],
  );

  const onCellTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    handleTouchStart(Number(el.dataset.row), Number(el.dataset.col), el.dataset.letter || '', e);
  }, [handleTouchStart]);

  const onCellMouseDown = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    handleMouseDown(Number(el.dataset.row), Number(el.dataset.col), el.dataset.letter || '', e);
  }, [handleMouseDown]);

  const onCellDoubleClick = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    handleDoubleClick(Number(el.dataset.row), Number(el.dataset.col));
  }, [handleDoubleClick]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        data-testid="hunt-live-word"
        className="min-h-[2.5rem] max-w-full truncate text-center font-display text-3xl font-black tracking-wide text-neo-navy dark:text-neo-cream sm:text-4xl"
        aria-live="polite"
      >
        {formedWord}
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label="Letter grid"
        tabIndex={isGameOver ? -1 : 0}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleRightClick}
        onKeyDown={handleKeyDown}
        className="relative aspect-square w-full max-w-[min(100%,56dvh)] touch-none select-none rounded-2xl border-4 border-neo-navy bg-neo-navy p-2 shadow-[6px_6px_0_0_var(--neo-pink)]"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${grid[0]?.length ?? 5}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid.length}, minmax(0, 1fr))`, gap: '6px' }}
      >
        {grid.map((row, i) =>
          row.map((letter, j) => {
            const key = `${i},${j}`;
            const selected = selectedKeys.has(key);
            const isLast = selectedCells.length > 0 && selectedCells[selectedCells.length - 1].row === i && selectedCells[selectedCells.length - 1].col === j;
            const eliminated = eliminatedLetters.has(letter.toUpperCase());
            const hinted = hintKeys.has(key);
            return (
              <div
                key={key}
                role="gridcell"
                data-row={i}
                data-col={j}
                data-letter={letter}
                aria-label={letter}
                onTouchStart={isGameOver ? undefined : onCellTouchStart}
                onMouseDown={isGameOver ? undefined : onCellMouseDown}
                onDoubleClick={isGameOver ? undefined : onCellDoubleClick}
                className={[
                  'flex aspect-square cursor-pointer items-center justify-center rounded-xl border-[3px] font-display font-black uppercase transition-[transform,background-color,box-shadow] duration-150',
                  'text-[clamp(1rem,4vw,2.25rem)]',
                  selected
                    ? 'border-neo-navy bg-neo-lime text-neo-navy shadow-[0_0_0_3px_var(--neo-pink)] scale-105'
                    : 'border-neo-cream/80 bg-neo-cream text-neo-navy',
                  isLast ? 'z-10 scale-110' : '',
                  eliminated && !selected ? 'opacity-40' : '',
                  hinted && !selected ? 'ring-4 ring-neo-cyan' : '',
                ].join(' ')}
              >
                {letter}
              </div>
            );
          }),
        )}
        {shownTrail.length > 0 && boardSize.w > 0 && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={boardSize.w}
            height={boardSize.h}
            viewBox={`0 0 ${boardSize.w} ${boardSize.h}`}
          >
            <path
              d={buildTrailPath(shownTrail)}
              fill="none"
              stroke="var(--neo-pink)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
            {head && <circle cx={head.x} cy={head.y} r={9} fill="var(--neo-pink)" />}
          </svg>
        )}
      </div>
    </div>
  );
};

export default HuntBoard;
