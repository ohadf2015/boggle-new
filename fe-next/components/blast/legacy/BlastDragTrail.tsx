'use client';

/**
 * BlastDragTrail — pure SVG overlay that connects selected tile centers
 * during a drag, SpellTower-style. Animates stroke fade-in via CSS only
 * (no JS animation, FPS-safe). Decorative, non-interactive.
 */
import React, { useMemo } from 'react';

export interface BlastDragTrailProps {
  selectedCells: Array<{ row: number; col: number }>;
  gridSize: number;
  /** Pixel width of the grid container (square). */
  containerWidth: number;
  /** Pixel padding inside the container before the first cell. */
  padding: number;
  /** Optional accent color override. Defaults to neo-cyan. */
  strokeColor?: string;
}

export function BlastDragTrail({
  selectedCells,
  gridSize,
  containerWidth,
  padding,
  strokeColor = '#BFFF00',
}: BlastDragTrailProps) {
  const points = useMemo(() => {
    if (selectedCells.length < 2 || containerWidth <= 0 || gridSize <= 0) return null;
    const playable = containerWidth - padding * 2;
    const cellSize = playable / gridSize;
    return selectedCells
      .map((c) => {
        const cx = padding + c.col * cellSize + cellSize / 2;
        const cy = padding + c.row * cellSize + cellSize / 2;
        return `${cx.toFixed(2)},${cy.toFixed(2)}`;
      })
      .join(' ');
  }, [selectedCells, gridSize, containerWidth, padding]);

  return (
    <svg
      data-testid="blast-drag-trail"
      aria-hidden="true"
      width={containerWidth}
      height={containerWidth}
      viewBox={`0 0 ${containerWidth} ${containerWidth}`}
      className="absolute inset-0 z-[5] motion-safe:animate-neo-pop"
      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 6px ${strokeColor})` }}
    >
      {points && (
        <>
          {/* Soft wide underlay = glow halo; crisp bright line on top. */}
          <polyline
            points={points}
            fill="none"
            stroke={strokeColor}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.25}
          />
          <polyline
            points={points}
            fill="none"
            stroke={strokeColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        </>
      )}
    </svg>
  );
}
