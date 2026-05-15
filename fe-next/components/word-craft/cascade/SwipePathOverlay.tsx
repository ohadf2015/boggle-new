'use client';
import { useEffect, useState, type RefObject } from 'react';
import type { CascadeGrid } from '@/lib/word-craft/cascade/boardGrid';

export interface SwipePathOverlayProps {
  grid: CascadeGrid;
  path: ReadonlyArray<string>;
  boardRef: RefObject<HTMLElement | null>;
}

/**
 * SVG overlay drawing a glowing line through the centers of the currently
 * selected cells. Reads cell positions from the live DOM so the overlay
 * tracks the actual rendered grid (handles RTL, resize, etc.).
 */
export function SwipePathOverlay({ grid, path, boardRef }: SwipePathOverlayProps) {
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || path.length === 0) {
      setPoints([]);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const next: Array<{ x: number; y: number }> = [];
    for (const id of path) {
      const el = board.querySelector<HTMLElement>(`[data-cell-id="${id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next.push({
        x: r.left + r.width / 2 - boardRect.left,
        y: r.top + r.height / 2 - boardRect.top,
      });
    }
    setPoints(next);
  }, [path, boardRef, grid]);

  if (points.length === 0) return null;

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-testid="swipe-path-overlay"
    >
      <path
        d={d}
        fill="none"
        stroke="rgb(191, 255, 0)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <path
        d={d}
        fill="none"
        stroke="rgb(255, 254, 240)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
    </svg>
  );
}
