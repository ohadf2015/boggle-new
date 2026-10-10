'use client';

import React, { useEffect, useRef } from 'react';
import { trailPathD, wheelSlotPoint, type TrailPoint } from '@/lib/wordWheel/trailGeometry';

const LIME = '#BFFF00';
const RED = '#FF3B5C';

export interface WordWheelTrailProps {
  /** Selected slots in order: -1 = centre letter, 0..outerCount-1 = outer ring. */
  selectedIndices: number[];
  radius: number;
  outerCount?: number;
  /** Client-space pointer, read per frame while dragging (no re-renders). */
  pointerPosRef?: React.RefObject<{ x: number; y: number } | null>;
  isDraggingRef?: React.RefObject<boolean>;
  /** Red trail for a rejected word. */
  invalid?: boolean;
}

/**
 * Chain of selected letters drawn over the wheel. The svg is 0×0 at the wheel
 * centre with overflow visible, so every path uses centre-relative coordinates
 * and needs no measurement. Only the live tip segment reads the DOM, and only
 * once per drag, to find the centre in client space.
 */
export default function WordWheelTrail({
  selectedIndices, radius, outerCount = 6, pointerPosRef, isDraggingRef, invalid = false,
}: WordWheelTrailProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<SVGPathElement>(null);
  const latestRef = useRef({ selectedIndices, radius, outerCount });

  useEffect(() => {
    latestRef.current = { selectedIndices, radius, outerCount };
  }, [selectedIndices, radius, outerCount]);

  useEffect(() => {
    let raf = 0;
    let origin: { x: number; y: number } | null = null;
    let wasDragging = false;
    let lastD = '';
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const tip = tipRef.current;
      const svg = svgRef.current;
      if (!tip || !svg) return;
      const dragging = isDraggingRef?.current ?? false;
      if (dragging && !wasDragging) {
        const r = svg.getBoundingClientRect();
        origin = { x: r.left, y: r.top };
      }
      wasDragging = dragging;
      const pointer = pointerPosRef?.current ?? null;
      const { selectedIndices: sel, radius: rad, outerCount: count } = latestRef.current;
      let d = '';
      if (dragging && pointer && origin && sel.length > 0) {
        const last = wheelSlotPoint(sel[sel.length - 1], rad, count, 0, 0);
        d = trailPathD([last, { x: pointer.x - origin.x, y: pointer.y - origin.y }]);
      }
      if (d !== lastD) {
        tip.setAttribute('d', d);
        lastD = d;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isDraggingRef, pointerPosRef]);

  const points: TrailPoint[] = selectedIndices.map((i) => wheelSlotPoint(i, radius, outerCount, 0, 0));
  const d = trailPathD(points);
  const ink = invalid ? RED : LIME;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      focusable="false"
      data-testid="word-wheel-trail"
      data-invalid={invalid ? 'true' : 'false'}
      className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
      width={0}
      height={0}
    >
      {d && (
        <>
          <path d={d} fill="none" stroke="#000" strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={ink} strokeOpacity={0.28} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" />
          <path data-trail-line d={d} fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={6} fill={ink} stroke="#000" strokeWidth={3} />
          ))}
        </>
      )}
      <path ref={tipRef} fill="none" stroke={ink} strokeWidth={6} strokeOpacity={0.75} strokeLinecap="round" />
    </svg>
  );
}
