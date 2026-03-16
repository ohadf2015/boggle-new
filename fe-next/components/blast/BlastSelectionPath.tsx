'use client';

import { memo } from 'react';
import type { SelectedCell } from '@/components/grid';

interface BlastSelectionPathProps {
  /** Currently selected cells in path order */
  selectedCells: SelectedCell[];
  /** Grid dimensions (e.g. 6 for 6x6) */
  gridSize: number;
}

/**
 * BlastSelectionPath — SVG polyline connecting selected cells during word tracing.
 *
 * Uses viewBox coordinates matching the grid (0,0 to gridSize,gridSize) so cell
 * centers naturally land at (col+0.5, row+0.5). The SVG stretches to fill the
 * grid container via absolute positioning, inheriting padding/gap alignment.
 *
 * The line uses a neon glow effect (neo-cyan) to match the neo-brutalist design.
 * Renders at z-[14] — above tile overlay (z-11) but below explosions (z-20).
 */
export const BlastSelectionPath = memo(function BlastSelectionPath({
  selectedCells,
  gridSize,
}: BlastSelectionPathProps) {
  if (selectedCells.length < 2) return null;

  const points = selectedCells
    .map(c => `${c.col + 0.5},${c.row + 0.5}`)
    .join(' ');

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[14]"
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="path-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.08" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Outer glow layer */}
      <polyline
        points={points}
        fill="none"
        stroke="rgba(0, 255, 255, 0.3)"
        strokeWidth="0.22"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#path-glow)"
      />
      {/* Core line */}
      <polyline
        points={points}
        fill="none"
        stroke="rgba(0, 255, 255, 0.7)"
        strokeWidth="0.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
