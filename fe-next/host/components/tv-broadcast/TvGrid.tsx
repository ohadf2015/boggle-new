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
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] aspect-square">
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
