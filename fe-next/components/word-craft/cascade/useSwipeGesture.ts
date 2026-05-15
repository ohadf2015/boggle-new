'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { coordsOf, type CascadeGrid } from '@/lib/word-craft/cascade/boardGrid';

export interface UseSwipeGestureOpts {
  grid: CascadeGrid;
  /** When true, diagonal steps are valid. */
  diagonal?: boolean;
  /** Fired on every path change while dragging. */
  onPathChange?: (path: string[]) => void;
  /** Fired on pointer release with the final path (may be empty). */
  onPathSubmit: (path: string[]) => void;
}

interface PointerHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
}

function cellIdFromTarget(target: EventTarget | null): string | null {
  if (!target || !(target as HTMLElement).closest) return null;
  const el = (target as HTMLElement).closest<HTMLElement>('[data-cell-id]');
  return el?.dataset.cellId ?? null;
}

function cellIdAtPoint(x: number, y: number): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.elementFromPoint(x, y);
  return cellIdFromTarget(el);
}

function isAdjacent(
  grid: CascadeGrid,
  fromId: string,
  toId: string,
  diagonal: boolean,
): boolean {
  const a = coordsOf(grid, fromId);
  const b = coordsOf(grid, toId);
  if (!a || !b) return false;
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  if (dr === 0 && dc === 0) return false;
  if (!diagonal) return dr + dc === 1;
  return dr <= 1 && dc <= 1;
}

export interface UseSwipeGestureResult {
  path: string[];
  isDragging: boolean;
  handlers: PointerHandlers;
  /** Programmatic reset, e.g. after submit. */
  reset: () => void;
}

export function useSwipeGesture(opts: UseSwipeGestureOpts): UseSwipeGestureResult {
  const { grid, diagonal = false, onPathChange, onPathSubmit } = opts;
  const [path, setPath] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const pathRef = useRef<string[]>([]);
  const draggingRef = useRef(false);

  const pushIfValid = useCallback(
    (id: string) => {
      const current = pathRef.current;
      if (current.length === 0) {
        pathRef.current = [id];
        setPath(pathRef.current);
        onPathChange?.(pathRef.current);
        return;
      }
      // Backtrack: pointer returned to previous cell → drop last
      if (current.length >= 2 && current[current.length - 2] === id) {
        pathRef.current = current.slice(0, -1);
        setPath(pathRef.current);
        onPathChange?.(pathRef.current);
        return;
      }
      // No duplicates, no skips
      if (current.includes(id)) return;
      if (!isAdjacent(grid, current[current.length - 1], id, diagonal)) return;
      pathRef.current = [...current, id];
      setPath(pathRef.current);
      onPathChange?.(pathRef.current);
    },
    [grid, diagonal, onPathChange],
  );

  const reset = useCallback(() => {
    pathRef.current = [];
    setPath([]);
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const id = cellIdFromTarget(e.target) ?? cellIdAtPoint(e.clientX, e.clientY);
      if (!id) return;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      draggingRef.current = true;
      setIsDragging(true);
      pathRef.current = [];
      pushIfValid(id);
    },
    [pushIfValid],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      const id = cellIdAtPoint(e.clientX, e.clientY);
      if (!id) return;
      pushIfValid(id);
    },
    [pushIfValid],
  );

  const finish = useCallback(() => {
    if (!draggingRef.current) return;
    const finalPath = pathRef.current;
    draggingRef.current = false;
    setIsDragging(false);
    onPathSubmit(finalPath);
    pathRef.current = [];
    setPath([]);
  }, [onPathSubmit]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      finish();
    },
    [finish],
  );

  const onPointerCancel = useCallback(() => finish(), [finish]);
  const onPointerLeave = useCallback(() => {
    // Don't finish on leave — pointer capture should keep events flowing.
    // This handler is here so React doesn't warn when consumer attaches it.
  }, []);

  // Failsafe: if we somehow miss pointerup (browser bug, tab switch mid-drag),
  // dispatch a finish on document-level pointerup while dragging.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if (draggingRef.current) finish();
    };
    window.addEventListener('pointerup', handler);
    return () => window.removeEventListener('pointerup', handler);
  }, [finish]);

  return {
    path,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
    reset,
  };
}
