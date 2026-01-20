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
      className="tv-grid-container w-full h-full flex items-center justify-center p-3 md:p-6"
      style={{ containerType: 'size' }}
    >
      {/* Square grid that fits within available space - uses min of container width/height */}
      <div
        className="aspect-square"
        style={{
          // Size based on the smaller dimension to ensure square fits
          width: 'min(100cqi, 100cqb)',
          height: 'min(100cqi, 100cqb)',
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
