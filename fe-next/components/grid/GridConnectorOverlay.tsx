'use client';

import { useState, useEffect, memo } from 'react';
import type { SelectedCell } from './types';

interface Props {
  selectedCells: SelectedCell[];
  gridEl: HTMLDivElement | null;
  color?: string;
}

interface Point { x: number; y: number; }

const GridConnectorOverlay = memo<Props>(({ selectedCells, gridEl, color = '#BFFF00' }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!gridEl) return;
    const update = () => setSize({ w: gridEl.offsetWidth, h: gridEl.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(gridEl);
    return () => ro.disconnect();
  }, [gridEl]);

  useEffect(() => {
    if (!gridEl || selectedCells.length < 2) { setPoints([]); return; }
    const gridRect = gridEl.getBoundingClientRect();
    const pts: Point[] = [];
    for (const cell of selectedCells) {
      const el = gridEl.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`) as HTMLElement | null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      pts.push({ x: r.left - gridRect.left + r.width / 2, y: r.top - gridRect.top + r.height / 2 });
    }
    setPoints(pts);
  }, [selectedCells, gridEl]);

  if (!gridEl || points.length < 2) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
    >
      {points.slice(1).map((p, i) => (
        <line
          key={i}
          x1={points[i].x} y1={points[i].y}
          x2={p.x} y2={p.y}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      ))}
    </svg>
  );
});

GridConnectorOverlay.displayName = 'GridConnectorOverlay';
export default GridConnectorOverlay;
