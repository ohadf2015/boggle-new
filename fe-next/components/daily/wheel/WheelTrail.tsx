'use client';

import React, { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { m } from 'framer-motion';
import { letterPoint, toDiscPercent, type DiscPoint } from '@/lib/wordWheel/discGeometry';
import type { WheelWordFxEvent } from './useWheelWordFx';

const INK = '#0b1530';
const LIME = '#bfff00';
const RED = '#ff3366';

interface WheelTrailProps {
  indices: number[];
  outerCount: number;
  discRef: RefObject<HTMLDivElement | null>;
  pointerPosRef: MutableRefObject<{ x: number; y: number } | null>;
  draggingRef: MutableRefObject<boolean>;
  fx: WheelWordFxEvent | null;
  reducedMotion: boolean;
}

const toPoints = (pts: DiscPoint[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

/** Ink-edged lime line through the chosen letters, with a live tail to the finger. */
const WheelTrail: React.FC<WheelTrailProps> = ({
  indices, outerCount, discRef, pointerPosRef, draggingRef, fx, reducedMotion,
}) => {
  const tailInkRef = useRef<SVGLineElement>(null);
  const tailRef = useRef<SVGLineElement>(null);
  const pts = indices.map((i) => letterPoint(i, outerCount));
  const last = pts[pts.length - 1] ?? null;

  useEffect(() => {
    if (!last) return;
    let raf = 0;
    const tick = () => {
      const pos = pointerPosRef.current;
      const rect = discRef.current?.getBoundingClientRect();
      const lines = [tailInkRef.current, tailRef.current];
      if (pos && rect && draggingRef.current && rect.width > 0) {
        const p = toDiscPercent(pos.x, pos.y, rect);
        for (const line of lines) {
          line?.setAttribute('x2', String(p.x));
          line?.setAttribute('y2', String(p.y));
          line?.setAttribute('visibility', 'visible');
        }
      } else {
        for (const line of lines) line?.setAttribute('visibility', 'hidden');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [last, discRef, pointerPosRef, draggingRef]);

  const ghostPts = fx ? fx.indices.map((i) => letterPoint(i, outerCount)) : [];
  const ghostColor = fx?.kind === 'bad' ? RED : '#ffffff';

  return (
    <svg
      data-testid="wheel-trail"
      aria-hidden
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 1 }}
    >
      {ghostPts.length > 1 && fx && (
        <m.g
          key={fx.id}
          data-testid="wheel-trail-ghost"
          data-kind={fx.kind}
          initial={{ opacity: 1, x: 0 }}
          animate={fx.kind === 'bad' && !reducedMotion
            ? { opacity: [1, 1, 0], x: [0, -2.2, 2.2, -1.6, 1.6, 0] }
            : { opacity: [1, 1, 0] }}
          transition={{ duration: fx.kind === 'bad' ? 0.75 : 0.5, ease: 'easeOut' }}
        >
          <polyline points={toPoints(ghostPts)} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <m.polyline
            points={toPoints(ghostPts)}
            fill="none"
            stroke={ghostColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ strokeWidth: 3 }}
            animate={{ strokeWidth: fx.kind === 'bad' ? 3 : [3, 4.2, 0.6] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 1.6px ${fx.kind === 'bad' ? RED : LIME})` }}
          />
        </m.g>
      )}
      {pts.length > 0 && (
        <g data-testid="wheel-trail-live">
          {pts.length > 1 && (
            <>
              <polyline points={toPoints(pts)} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              <polyline
                points={toPoints(pts)}
                fill="none"
                stroke={LIME}
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 1.4px rgba(191,255,0,0.9))' }}
              />
            </>
          )}
          {last && (
            <>
              <line ref={tailInkRef} x1={last.x} y1={last.y} x2={last.x} y2={last.y} stroke={INK} strokeWidth={3.6} strokeLinecap="round" visibility="hidden" />
              <line ref={tailRef} x1={last.x} y1={last.y} x2={last.x} y2={last.y} stroke={LIME} strokeWidth={1.8} strokeLinecap="round" visibility="hidden" opacity={0.9} />
            </>
          )}
        </g>
      )}
    </svg>
  );
};

export default WheelTrail;
