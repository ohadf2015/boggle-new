'use client';

/**
 * BlastRouteOverlay — visual affordance for the path_route Goal Gallery
 * mechanic. Renders two glowing endpoint rings (lime start, pink end) and
 * a gentle bezier wire connecting them across the board. SVG-based for
 * crisp Neo-Brutalist edges + RTL-friendly transforms.
 *
 * Why SVG over Pixi: a single static line + 2 rings is well within DOM/SVG
 * comfort zone, and integrating Pixi for this would conflict with the
 * existing BlastEffectsCanvas Pixi pipeline. SVG sits cleanly above the
 * tile grid, picks up GPU layer-promotion via `transform: translateZ(0)`.
 *
 * Expected to overlay the same coordinate space as BlastBoard's tile grid.
 * Caller passes cell→pixel mapping via `cellSize` + `gap` props.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';

interface Cell { row: number; col: number; }

interface BlastRouteOverlayProps {
  startCell: Cell;
  endCell: Cell;
  /** Pixel size of one cell (assumed square). */
  cellSize: number;
  /** Gap between cells in pixels. */
  gap?: number;
  /** When true, route is satisfied — switch to muted "completed" state. */
  completed?: boolean;
  /** When true, fade out (e.g. cascade hide). */
  hidden?: boolean;
  /** Optional className for layout wrapper. */
  className?: string;
}

export function BlastRouteOverlay({
  startCell, endCell, cellSize, gap = 4,
  completed = false, hidden = false, className,
}: BlastRouteOverlayProps) {
  const groupRef = useRef<SVGGElement>(null);

  // Cell center → pixel coords (relative to the SVG viewBox the overlay
  // covers; caller anchors via absolute positioning).
  const stride = cellSize + gap;
  const sx = startCell.col * stride + cellSize / 2;
  const sy = startCell.row * stride + cellSize / 2;
  const ex = endCell.col * stride + cellSize / 2;
  const ey = endCell.row * stride + cellSize / 2;

  // Bezier control points lift the wire above straight-line so it feels like
  // a pulled rope rather than a ruler. Asymmetric so route reads visually.
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  // Perpendicular offset for the curve apex
  const liftMag = Math.min(60, len * 0.18);
  const px = midX + (-dy / len) * liftMag;
  const py = midY + (dx / len) * liftMag;
  const pathD = `M ${sx},${sy} Q ${px},${py} ${ex},${ey}`;

  // Pulse rings on completion
  useEffect(() => {
    if (!completed) return;
    const el = groupRef.current;
    if (!el) return;
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    // Skip in test env — jsdom doesn't implement SVGAnimatedTransformList
    // properly, GSAP throws in async tick. Vitest sets VITEST env.
    const isTestEnv = typeof process !== 'undefined' && process.env?.VITEST === 'true';
    if (isTestEnv) return;
    gsap.fromTo(el,
      { scale: 1 }, { scale: 1.04, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '50% 50%' },
    );
  }, [completed]);

  return (
    <svg
      data-testid="blast-route-overlay"
      data-completed={completed ? 'true' : 'false'}
      className={cn(
        'absolute inset-0 pointer-events-none',
        'transition-opacity duration-300',
        hidden ? 'opacity-0' : 'opacity-100',
        className,
      )}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <g ref={groupRef}>
        {/* Wire: hard black underlay (Neo-Brutalist shadow) + electric stroke on top */}
        <path
          d={pathD}
          stroke="#000"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          opacity={completed ? 0.4 : 0.95}
        />
        <path
          d={pathD}
          stroke={completed ? '#7CFFA1' : '#BFFF00'}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={completed ? '0' : '6 6'}
          opacity={completed ? 0.7 : 1}
        >
          {!completed && (
            <animate
              attributeName="stroke-dashoffset"
              from="0" to="-24" dur="1.2s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Start ring — lime */}
        <RouteRing cx={sx} cy={sy} r={cellSize * 0.45} color="#BFFF00" pulse={!completed} />

        {/* End ring — pink */}
        <RouteRing cx={ex} cy={ey} r={cellSize * 0.45} color="#FF1493" pulse={!completed} />
      </g>
    </svg>
  );
}

function RouteRing({ cx, cy, r, color, pulse }: {
  cx: number; cy: number; r: number; color: string; pulse: boolean;
}) {
  return (
    <g>
      {/* Hard-shadow underlay for Neo-Brutal feel */}
      <circle cx={cx + 2} cy={cy + 2} r={r} fill="none" stroke="#000" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3}>
        {pulse && (
          <animate
            attributeName="r"
            values={`${r};${r * 1.15};${r}`}
            dur="1.4s" repeatCount="indefinite"
          />
        )}
      </circle>
    </g>
  );
}
