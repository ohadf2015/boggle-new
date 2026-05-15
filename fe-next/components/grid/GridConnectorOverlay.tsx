'use client';

import { useState, useEffect, useMemo, useRef, memo } from 'react';
import type { SelectedCell } from './types';

interface Props {
  selectedCells: SelectedCell[];
  gridEl: HTMLDivElement | null;
  color?: string;
}

interface Point { x: number; y: number; }

/**
 * Renders SVG connector line between selected cells during drag.
 *
 * Perf: per-cell getBoundingClientRect on every selection change forced a
 * synchronous layout flush per drag step. On mid-tier mobile during MP
 * classic, this stacked with socket-burst re-renders into visible drag
 * stutter. We now measure each cell's center once on mount and on resize,
 * cache by `${row}-${col}`, and look up by key during drag — zero layout
 * reads per drag tick.
 */
const GridConnectorOverlay = memo<Props>(({ selectedCells, gridEl, color = '#BFFF00' }) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const centersRef = useRef<Map<string, Point>>(new Map());
  const [measureTick, setMeasureTick] = useState(0);

  useEffect(() => {
    if (!gridEl) return;
    let raf = 0;

    const measure = () => {
      const gridRect = gridEl.getBoundingClientRect();
      setSize({ w: gridEl.offsetWidth, h: gridEl.offsetHeight });
      const map = new Map<string, Point>();
      const cells = gridEl.querySelectorAll<HTMLElement>('[data-row][data-col]');
      cells.forEach((el) => {
        const r = el.getBoundingClientRect();
        const key = `${el.dataset.row}-${el.dataset.col}`;
        map.set(key, {
          x: r.left - gridRect.left + r.width / 2,
          y: r.top - gridRect.top + r.height / 2,
        });
      });
      centersRef.current = map;
      setMeasureTick((t) => t + 1);
    };

    measure();
    raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(gridEl);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [gridEl]);

  const points = useMemo<Point[]>(() => {
    // measureTick is the explicit invalidation signal for centersRef.current
    // (a mutable ref ESLint can't reason about). Reading it here keeps the
    // exhaustive-deps rule happy + makes the cache-bust intent obvious.
    void measureTick;
    if (!gridEl || selectedCells.length < 2) return [];
    const pts: Point[] = [];
    const centers = centersRef.current;
    for (const cell of selectedCells) {
      const p = centers.get(`${cell.row}-${cell.col}`);
      if (p) pts.push(p);
    }
    return pts;
  }, [selectedCells, gridEl, measureTick]);

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
