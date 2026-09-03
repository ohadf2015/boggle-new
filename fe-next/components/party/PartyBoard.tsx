'use client';

import { useCallback, useRef, useState, type ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { LetterGrid } from '@/shared/types/game';

interface Cell {
  r: number;
  c: number;
}

interface PartyBoardProps {
  grid: LetterGrid;
  disabled?: boolean;
  onSubmit: (word: string) => void;
}

function keyOf(cell: Cell): string {
  return `${cell.r},${cell.c}`;
}

function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1;
}

export function PartyBoard({ grid, disabled, onSubmit }: PartyBoardProps): ReactElement {
  const [path, setPath] = useState<Cell[]>([]);
  const dragging = useRef(false);
  const pathRef = useRef<Cell[]>([]);

  const commit = useCallback(() => {
    dragging.current = false;
    const letters = pathRef.current
      .map((cell) => grid[cell.r]?.[cell.c] ?? '')
      .join('');
    pathRef.current = [];
    setPath([]);
    if (letters.length >= 2) onSubmit(letters);
  }, [grid, onSubmit]);

  const extend = useCallback((cell: Cell) => {
    const current = pathRef.current;
    const last = current[current.length - 1];
    if (!last) {
      pathRef.current = [cell];
      setPath([cell]);
      return;
    }
    if (keyOf(last) === keyOf(cell)) return;
    if (current.some((p) => keyOf(p) === keyOf(cell))) return;
    if (!isAdjacent(last, cell)) return;
    const next = [...current, cell];
    pathRef.current = next;
    setPath(next);
  }, []);

  const cellFromPoint = (x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y);
    const node = el?.closest('[data-party-cell]') as HTMLElement | null;
    if (!node) return null;
    const r = Number(node.dataset.r);
    const c = Number(node.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c };
  };

  const onPointerDown = (cell: Cell) => (event: React.PointerEvent) => {
    if (disabled) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragging.current = true;
    pathRef.current = [cell];
    setPath([cell]);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current || disabled) return;
    const cell = cellFromPoint(event.clientX, event.clientY);
    if (cell) extend(cell);
  };

  const selected = new Set(path.map(keyOf));

  return (
    <div
      className="mx-auto grid w-full max-w-sm gap-1.5 touch-none"
      style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 4}, minmax(0, 1fr))` }}
      onPointerMove={onPointerMove}
      onPointerUp={commit}
      onPointerCancel={commit}
      role="grid"
    >
      {grid.map((row, r) =>
        row.map((letter, c) => {
          const active = selected.has(keyOf({ r, c }));
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              role="gridcell"
              data-party-cell=""
              data-r={r}
              data-c={c}
              disabled={disabled}
              onPointerDown={onPointerDown({ r, c })}
              className={cn(
                'aspect-square rounded-neo border-neo border-black font-neo-display text-xl font-bold uppercase',
                'shadow-hard select-none',
                active ? 'bg-neo-lime text-black' : 'bg-neo-cream text-black',
                disabled && 'opacity-60',
              )}
            >
              {letter}
            </button>
          );
        }),
      )}
    </div>
  );
}
