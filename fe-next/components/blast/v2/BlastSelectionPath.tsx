'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { CellId } from '@/lib/blast/v2/types';

type Props = {
  cells: CellId[];
  getCellCenter: (id: CellId) => { x: number; y: number } | null;
  color: string;
};

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function BlastSelectionPath({ cells, getCellCenter, color }: Props) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const glowRef = useRef<SVGPathElement | null>(null);
  const prevLenRef = useRef(0);

  // Animate stroke draw-in any time the path's geometry (cells count) grows.
  // getTotalLength gives real path length so dashoffset starts at the new
  // segment length and tweens to 0 — reads as the line "extending" toward
  // the just-added tile rather than re-drawing the whole shape.
  useEffect(() => {
    const path = pathRef.current;
    const glow = glowRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    if (len === 0) {
      prevLenRef.current = 0;
      return;
    }
    const prevLen = prevLenRef.current;
    const grew = len > prevLen + 0.5;
    prevLenRef.current = len;

    gsap.set([path, glow].filter(Boolean), { strokeDasharray: len });

    if (reducedMotion()) {
      gsap.set([path, glow].filter(Boolean), { strokeDashoffset: 0 });
      return;
    }

    // Start from previous length so already-drawn portion stays, new tail
    // animates in. On first cell, prevLen is 0 → full draw-in.
    const startOffset = grew ? Math.max(len - prevLen, 0) : 0;
    const tl = gsap.timeline();
    tl.fromTo(
      path,
      { strokeDashoffset: startOffset },
      { strokeDashoffset: 0, duration: 0.22, ease: 'power2.out' },
      0,
    );
    if (glow) {
      tl.fromTo(
        glow,
        { strokeDashoffset: startOffset, opacity: 0.0 },
        { strokeDashoffset: 0, opacity: 0.55, duration: 0.32, ease: 'power2.out' },
        0,
      );
    }
    // Tactile micro-pulse on the active leading edge when a new cell joins.
    if (grew) {
      tl.fromTo(
        path,
        { strokeWidth: 14 },
        { strokeWidth: 10, duration: 0.22, ease: 'back.out(2)' },
        0,
      );
    }
    return () => {
      tl.kill();
    };
  }, [cells.length]);

  if (cells.length === 0) {
    prevLenRef.current = 0;
    return null;
  }
  const pts = cells.map((id) => getCellCenter(id)).filter((p): p is { x: number; y: number } => p != null);
  if (pts.length === 0) return null;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg className="pointer-events-none absolute inset-0" data-testid="blast-selection-path">
      {/* Outer halo for chunky neo-brutalist glow — fades in with the line. */}
      <path
        ref={glowRef}
        d={d}
        stroke={color}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0}
        style={{ filter: 'blur(6px)' }}
      />
      <path
        ref={pathRef}
        d={d}
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.95}
      />
    </svg>
  );
}
