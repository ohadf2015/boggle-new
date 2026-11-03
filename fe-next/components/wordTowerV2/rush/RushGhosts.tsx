'use client';

import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { GhostRival } from '@/lib/wordTowerV2/rush/types';
import { GhostRivalsLayer } from './GhostRivalsLayer';

type T = (key: string, params?: Record<string, string | number>) => string;

const SAMPLE_M = 100;

export interface ProjectorView {
  y0: number;
  y100: number;
  h: number;
}

export function sampleProjector(fn: ((hM: number) => number) | null, h: number, top = 0): ProjectorView | null {
  if (!fn || h <= 0) return null;
  return { y0: Math.round(fn(0) - top), y100: Math.round(fn(SAMPLE_M) - top), h: Math.round(h) };
}

export function sameView(a: ProjectorView | null, b: ProjectorView | null): boolean {
  return a === b || (!!a && !!b && a.y0 === b.y0 && a.y100 === b.y100 && a.h === b.h);
}

interface Props {
  t: T;
  rivals: GhostRival[];
  projectorRef: MutableRefObject<((hM: number) => number) | null>;
  /** The canvas's own box: projector Y is canvas-local, so the layer must share its rect. */
  canvasClass: string;
}

/** Follows the camera on rAF but re-renders only when the projection moves a whole pixel. */
export function RushGhosts({ t, rivals, projectorRef, canvasClass }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<ProjectorView | null>(null);
  const viewRef = useRef<ProjectorView | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const box = boxRef.current;
      const next = sampleProjector(projectorRef.current, box?.clientHeight ?? 0, box?.offsetTop ?? 0);
      if (sameView(viewRef.current, next)) return;
      viewRef.current = next;
      setView(next);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [projectorRef]);

  const heightToY = useMemo(() => (view ? (m: number) => view.y0 + ((view.y100 - view.y0) * m) / SAMPLE_M : null), [view]);

  return (
    <div className={`pointer-events-none z-[5] ${canvasClass}`}>
      {/* Starts under the HUD so a name tag never slides beneath the top bar. */}
      <div ref={boxRef} className="absolute inset-x-0 bottom-0 top-[var(--wt2-hud,7rem)] overflow-hidden">
        {heightToY && view ? <GhostRivalsLayer t={t} rivals={rivals} heightToY={heightToY} viewportHeight={view.h} /> : null}
      </div>
    </div>
  );
}
