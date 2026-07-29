'use client';

import React, { memo } from 'react';
import GridComponent from '../../../components/GridComponent';
import type { LetterGrid } from '@/shared/types/game';

interface TvGridProps {
  grid: LetterGrid;
  fireRoundActive?: boolean;
  earthquakeShaking?: boolean;
}

/**
 * TvGrid - Large, non-interactive grid display for TV broadcast mode
 * Uses the existing GridComponent with TV-optimized settings
 */
const TvGrid = memo<TvGridProps>(({
  grid,
  fireRoundActive = false,
  earthquakeShaking = false,
}) => {
  return (
    <div
      className="tv-grid-container w-full h-full flex items-center justify-center p-2 sm:p-3 md:p-6"
      style={{ containerType: 'size' }}
      role="img"
      aria-label="Game letter grid"
    >
      {/* Square grid that fits within available space - uses min of container width/height */}
      {/* On mobile, use more of the available space with tighter padding */}
      <div
        className="aspect-square max-w-full max-h-full"
        style={{
          // Size based on the smaller dimension to ensure square fits
          // Use 95% to leave some breathing room on mobile
          width: 'min(95cqi, 95cqb)',
          height: 'min(95cqi, 95cqb)',
        }}
      >
        <GridComponent
          grid={grid}
          interactive={false}
          largeText={true}
          animateOnMount={true}
          fireRoundActive={fireRoundActive}
          earthquakeShaking={earthquakeShaking}
        />
      </div>
    </div>
  );
});

TvGrid.displayName = 'TvGrid';

export default TvGrid;
