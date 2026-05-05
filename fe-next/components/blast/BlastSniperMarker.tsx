'use client';

/**
 * BlastSniperMarker — visual affordance for the tile_sniper Goal Gallery
 * mechanic. Renders a red crosshair + bullseye ring + corner brackets
 * pulsing on the marked target cell. SVG so the lines stay crisp at any
 * scale; pointer-events-none so the underlying tile stays interactive.
 *
 * "Hit" state collapses the ring + fades the X to a soft green tick to
 * acknowledge the kill without obstructing the board.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';

interface BlastSniperMarkerProps {
  targetCell: { row: number; col: number };
  cellSize: number;
  gap?: number;
  /** True once the player's word touched the target cell. */
  hit?: boolean;
  hidden?: boolean;
  className?: string;
}

export function BlastSniperMarker({
  targetCell, cellSize, gap = 0,
  hit = false, hidden = false, className,
}: BlastSniperMarkerProps) {
  const groupRef = useRef<SVGGElement>(null);

  const stride = cellSize + gap;
  const cx = targetCell.col * stride + cellSize / 2;
  const cy = targetCell.row * stride + cellSize / 2;
  const r = cellSize * 0.38;
  // Corner brackets: short L-shaped strokes anchored slightly outside the ring
  const bracketSize = cellSize * 0.18;
  const bracketOffset = cellSize * 0.46;

  useEffect(() => {
    if (!hit) return;
    const el = groupRef.current;
    if (!el) return;
    const isTestEnv = typeof process !== 'undefined' && process.env?.VITEST === 'true';
    if (isTestEnv) return;
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    // Bullseye contracts on hit
    gsap.fromTo(el,
      { scale: 1 }, { scale: 1.18, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '50% 50%' },
    );
  }, [hit]);

  const ringColor = hit ? '#7CFFA1' : '#FF1493';
  const xColor = hit ? '#7CFFA1' : '#FF3366';

  return (
    <svg
      data-testid="blast-sniper-marker"
      data-hit={hit ? 'true' : 'false'}
      className={cn(
        'absolute inset-0 pointer-events-none transition-opacity duration-300',
        hidden ? 'opacity-0' : 'opacity-100',
        className,
      )}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <g ref={groupRef}>
        {/* Soft halo */}
        <circle cx={cx} cy={cy} r={r * 1.6} fill={ringColor} opacity={hit ? 0.05 : 0.12} />

        {/* Hard-shadow ring underlay */}
        <circle cx={cx + 2} cy={cy + 2} r={r} fill="none" stroke="#000" strokeWidth={3} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={3}>
          {!hit && (
            <animate attributeName="r"
              values={`${r};${r * 1.12};${r}`}
              dur="1.4s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Crosshair X (rotated 45°) */}
        <line x1={cx - r * 0.6} y1={cy - r * 0.6}
              x2={cx + r * 0.6} y2={cy + r * 0.6}
              stroke="#000" strokeWidth={5} strokeLinecap="round" />
        <line x1={cx - r * 0.6} y1={cy + r * 0.6}
              x2={cx + r * 0.6} y2={cy - r * 0.6}
              stroke="#000" strokeWidth={5} strokeLinecap="round" />
        <line x1={cx - r * 0.6} y1={cy - r * 0.6}
              x2={cx + r * 0.6} y2={cy + r * 0.6}
              stroke={xColor} strokeWidth={3} strokeLinecap="round"
              opacity={hit ? 0.5 : 1} />
        <line x1={cx - r * 0.6} y1={cy + r * 0.6}
              x2={cx + r * 0.6} y2={cy - r * 0.6}
              stroke={xColor} strokeWidth={3} strokeLinecap="round"
              opacity={hit ? 0.5 : 1} />

        {/* Corner brackets */}
        {[
          { ax: cx - bracketOffset, ay: cy - bracketOffset, dx: 1, dy: 1 },
          { ax: cx + bracketOffset, ay: cy - bracketOffset, dx: -1, dy: 1 },
          { ax: cx - bracketOffset, ay: cy + bracketOffset, dx: 1, dy: -1 },
          { ax: cx + bracketOffset, ay: cy + bracketOffset, dx: -1, dy: -1 },
        ].map((c, i) => (
          <g key={i}>
            <line x1={c.ax} y1={c.ay}
                  x2={c.ax + c.dx * bracketSize} y2={c.ay}
                  stroke="#000" strokeWidth={3} strokeLinecap="round" />
            <line x1={c.ax} y1={c.ay}
                  x2={c.ax} y2={c.ay + c.dy * bracketSize}
                  stroke="#000" strokeWidth={3} strokeLinecap="round" />
          </g>
        ))}
      </g>
    </svg>
  );
}
