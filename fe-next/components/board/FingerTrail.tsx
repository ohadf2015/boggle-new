'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SelectedCell } from '@/components/grid/types';
import { getSelectionEscalation } from '@/components/grid/selectionEscalation';
import {
  TRAIL_ACCENT,
  TRAIL_INK,
  tailSegment,
  toPointsAttr,
  trailPoints,
  trailStroke,
  type Point,
} from './trailGeometry';

interface FingerTrailProps {
  selectedCells: SelectedCell[];
  gridEl: HTMLDivElement | null;
  comboLevel?: number;
}

const EMPTY: Point[] = [];

/**
 * The one trail for every letter board. Ink underlay, accent halo and accent
 * core run through the selected tile centres; a live tail follows the finger
 * from the last tile. The tail is written straight to the SVG from a
 * rAF-throttled pointermove, so a drag costs no React renders per move.
 */
const FingerTrail = memo<FingerTrailProps>(({ selectedCells, gridEl, comboLevel = 0 }) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cellSize, setCellSize] = useState(0);
  const [measureTick, setMeasureTick] = useState(0);
  const centersRef = useRef<Map<string, Point>>(new Map());
  const gridOriginRef = useRef<Point>({ x: 0, y: 0 });
  const pointerRef = useRef<Point | null>(null);
  const lastCommittedRef = useRef<Point | undefined>(undefined);
  const tailRefs = useRef<Array<SVGPolylineElement | null>>([]);

  const measure = useCallback(() => {
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    gridOriginRef.current = { x: gridRect.left, y: gridRect.top };
    setSize({ w: gridEl.offsetWidth, h: gridEl.offsetHeight });
    const map = new Map<string, Point>();
    let measured = 0;
    gridEl.querySelectorAll<HTMLElement>('[data-row][data-col]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!measured) measured = r.width;
      map.set(`${el.dataset.row}-${el.dataset.col}`, {
        x: r.left - gridRect.left + r.width / 2,
        y: r.top - gridRect.top + r.height / 2,
      });
    });
    centersRef.current = map;
    setCellSize(measured);
    setMeasureTick((t) => t + 1);
  }, [gridEl]);

  useEffect(() => {
    if (!gridEl) return undefined;
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(gridEl);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [gridEl, measure]);

  // Re-measure when a word starts. The mount entrance scale would otherwise bake
  // compressed centres into the viewBox; one measure per word costs nothing per drag step.
  const hasSelection = selectedCells.length > 0;
  const wasSelectingRef = useRef(false);
  useEffect(() => {
    if (hasSelection && !wasSelectingRef.current) {
      wasSelectingRef.current = true;
      const raf = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(raf);
    }
    if (!hasSelection) wasSelectingRef.current = false;
    return undefined;
  }, [hasSelection, measure]);

  const committed = useMemo<Point[]>(() => {
    void measureTick;
    if (!hasSelection) return EMPTY;
    const len = selectedCells.length;
    return trailPoints(
      selectedCells,
      centersRef.current,
      (i) => getSelectionEscalation(i, len, comboLevel).liftY,
    );
  }, [selectedCells, hasSelection, measureTick, comboLevel]);

  useLayoutEffect(() => {
    lastCommittedRef.current = committed[committed.length - 1];
  }, [committed]);

  useEffect(() => {
    if (!hasSelection || !gridEl) return undefined;
    const doc = gridEl.ownerDocument;
    let raf = 0;
    pointerRef.current = null;
    tailRefs.current.forEach((el) => el?.setAttribute('points', ''));

    const write = () => {
      raf = 0;
      const str = toPointsAttr(tailSegment(lastCommittedRef.current, pointerRef.current));
      tailRefs.current.forEach((el) => el?.setAttribute('points', str));
    };
    const onMove = (e: PointerEvent) => {
      const o = gridOriginRef.current;
      pointerRef.current = { x: e.clientX - o.x, y: e.clientY - o.y };
      if (!raf) raf = requestAnimationFrame(write);
    };
    doc.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      doc.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
      pointerRef.current = null;
    };
  }, [hasSelection, gridEl]);

  if (!gridEl || !hasSelection) return null;

  const s = trailStroke(cellSize);
  const layers = [
    { stroke: TRAIL_INK, width: s.underlay, opacity: 0.9 },
    { stroke: TRAIL_ACCENT, width: s.halo, opacity: 0.35 },
    { stroke: TRAIL_ACCENT, width: s.core, opacity: 1 },
  ];
  const committedStr = toPointsAttr(committed.length >= 2 ? committed : EMPTY);

  return (
    <svg
      data-testid="finger-trail"
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
    >
      <g data-trail-layer="committed">
        {layers.map((l, i) => (
          <polyline
            key={`c-${i}`}
            points={committedStr}
            fill="none"
            stroke={l.stroke}
            strokeWidth={l.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={l.opacity}
          />
        ))}
      </g>
      <g data-trail-layer="tail">
        {layers.map((l, i) => (
          <polyline
            key={`t-${i}`}
            ref={(el) => { tailRefs.current[i] = el; }}
            fill="none"
            stroke={l.stroke}
            strokeWidth={l.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={l.opacity}
          />
        ))}
      </g>
    </svg>
  );
});

FingerTrail.displayName = 'FingerTrail';
export default FingerTrail;
