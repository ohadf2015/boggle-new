'use client';
import { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { coordsOf, type CascadeGrid } from '@/lib/word-craft/cascade/boardGrid';
import { useSwipeGesture } from './useSwipeGesture';
import { SwipePathOverlay } from './SwipePathOverlay';

export interface CascadeBoardProps {
  grid: CascadeGrid;
  diagonal?: boolean;
  onSubmitPath: (path: string[]) => void;
  /** Cells that recently burned — visual highlight only. */
  recentlyBurnedIds?: ReadonlyArray<string>;
  /** Fire row index (0 = none lit, fireRow = rows lit from bottom). */
  fireRow?: number;
  /** Disable input during transitions (e.g. round result). */
  disabled?: boolean;
}

export function CascadeBoard({
  grid,
  diagonal = false,
  onSubmitPath,
  recentlyBurnedIds,
  fireRow = 0,
  disabled = false,
}: CascadeBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const burnedSet = useMemo(
    () => new Set(recentlyBurnedIds ?? []),
    [recentlyBurnedIds],
  );

  const handleSubmit = (path: string[]) => {
    if (disabled) return;
    if (path.length >= 3) onSubmitPath(path);
  };

  const swipe = useSwipeGesture({
    grid,
    diagonal,
    onPathSubmit: handleSubmit,
  });

  const selectedSet = useMemo(() => new Set(swipe.path), [swipe.path]);

  return (
    <div
      ref={boardRef}
      data-testid="cascade-board"
      data-dragging={String(swipe.isDragging)}
      className={clsx(
        'relative grid touch-none select-none gap-1.5 p-2',
        'rounded-neo border-neo-thick border-black bg-neo-navy shadow-hard-lg',
        disabled && 'pointer-events-none opacity-70',
      )}
      style={{
        gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
        aspectRatio: `${grid.cols} / ${grid.rows}`,
      }}
      {...swipe.handlers}
    >
      {grid.cells.map((cell) => {
        const coords = coordsOf(grid, cell.id);
        const inFire = coords !== null && coords.row >= grid.rows - fireRow;
        const isEmpty = cell.letter === null;
        const isSelected = selectedSet.has(cell.id);
        const isBurning = burnedSet.has(cell.id);
        return (
          <button
            key={cell.id}
            type="button"
            tabIndex={-1}
            data-cell-id={cell.id}
            data-row={coords?.row}
            data-col={coords?.col}
            data-board-cell={coords ? `${coords.row},${coords.col}` : undefined}
            className={clsx(
              'relative flex items-center justify-center',
              'rounded-neo border-neo border-black',
              'font-neo-display text-[5cqw] font-bold uppercase',
              'shadow-hard-sm transition-transform',
              isEmpty
                ? 'bg-neo-navy-light/40 text-transparent'
                : 'bg-neo-cream text-neo-navy',
              isSelected && 'scale-95 bg-neo-lime text-neo-navy shadow-hard',
              isBurning && 'animate-neo-shake bg-neo-pink',
              inFire && !isSelected && 'ring-2 ring-neo-orange',
              disabled && 'opacity-60',
            )}
          >
            <span className="pointer-events-none">{cell.letter}</span>
          </button>
        );
      })}
      <SwipePathOverlay grid={grid} path={swipe.path} boardRef={boardRef} />
    </div>
  );
}
