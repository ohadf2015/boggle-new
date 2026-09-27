'use client';

import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import type { SelectedCell } from './types';
import { getSelectionEscalation } from './selectionEscalation';

interface Props {
  selectedCells: SelectedCell[];
  gridEl: HTMLDivElement | null;
  color?: string;
  /** Same value GridCell uses for its lift transform — keeps line endpoints
   *  glued to the visible (lifted) tile center instead of the layout center. */
  comboLevel?: number;
}

interface Point { x: number; y: number; }

/**
 * Renders SVG connector line between selected cells during drag.
 *
 * Perf: per-cell getBoundingClientRect on every selection change forced a
 * synchronous layout flush per drag step. On mid-tier mobile during MP
 * classic, this stacked with socket-burst re-renders into visible drag
 * stutter. We measure each cell's center once on mount and on resize,
 * cache by `${row}-${col}`, and look up by key during drag — zero layout
 * reads per drag tick.
 *
 * Alignment: cached centers are layout-rest. Selected tiles get a
 * Framer Motion `y: liftY` translate (−2..−10 px, varies per selection
 * index + combo via getSelectionEscalation). We mirror that math here
 * so line endpoints track the visible lifted tile center instead of
 * sitting below it.
 *
 * Render: one <polyline> not N <line>s — single DOM node + attribute
 * update per drag step, vs N keyed-child diffs.
 *
 * Freshness: centers are measured relative to the grid (shift-invariant — a
 * chrome push-down moves grid+cells together, so relative centers don't drift).
 * The real staleness source is the board's mount entrance animation (frame
 * `scale 0.9→1`): the mount + rAF measurement lands mid-scale, baking compressed
 * centers into an unscaled viewBox → lines ride toward the top for the whole game.
 * We therefore ALSO re-measure once at each selection start (length 0→≥1), which
 * runs long after the entrance settles — one measure per word-build, no per-drag
 * layout reads, lines land on the real tile centers.
 */
const GridConnectorOverlay = memo<Props>(({ selectedCells, gridEl, color = '#BFFF00', comboLevel = 0 }) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const centersRef = useRef<Map<string, Point>>(new Map());
  const [measureTick, setMeasureTick] = useState(0);

  const measure = useCallback(() => {
    if (!gridEl) return;
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
  }, [gridEl]);

  useEffect(() => {
    if (!gridEl) return;
    let raf = 0;
    measure();
    raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(gridEl);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [gridEl, measure]);

  // Re-measure when a NEW selection starts (empty → non-empty). Catches centers
  // staled by the mount entrance scale or any post-mount board resize, without
  // adding per-drag-step layout reads. Deferred a frame so the layout is settled.
  const wasSelectingRef = useRef(false);
  const hasSelection = selectedCells.length > 0;
  useEffect(() => {
    if (hasSelection && !wasSelectingRef.current) {
      const raf = requestAnimationFrame(measure);
      wasSelectingRef.current = true;
      return () => cancelAnimationFrame(raf);
    }
    if (!hasSelection) wasSelectingRef.current = false;
    return undefined;
  }, [hasSelection, measure]);

  const pointsStr = useMemo<string>(() => {
    // measureTick is the explicit invalidation signal for centersRef.current
    // (a mutable ref ESLint can't reason about). Reading it here keeps the
    // exhaustive-deps rule happy + makes the cache-bust intent obvious.
    void measureTick;
    if (!gridEl || selectedCells.length < 2) return '';
    const centers = centersRef.current;
    const len = selectedCells.length;
    let out = '';
    for (let i = 0; i < len; i++) {
      const cell = selectedCells[i];
      const p = centers.get(`${cell.row}-${cell.col}`);
      if (!p) continue;
      // Mirror GridCell's `y: liftY` transform so the line endpoint sits
      // on the visible lifted tile center, not the layout rest center.
      const liftY = getSelectionEscalation(i, len, comboLevel).liftY;
      out += (out ? ' ' : '') + `${p.x},${p.y + liftY}`;
    }
    return out;
  }, [selectedCells, gridEl, measureTick, comboLevel]);

  if (!gridEl || !pointsStr) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
});

GridConnectorOverlay.displayName = 'GridConnectorOverlay';
export default GridConnectorOverlay;
