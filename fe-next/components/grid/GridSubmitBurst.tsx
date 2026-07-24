'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

export type SubmitBurstType = 'accepted' | 'rejected' | 'duplicate' | 'foundByOther';

interface GridSubmitBurstProps {
  row: number;
  col: number;
  type: SubmitBurstType;
  onDone?: () => void;
}

/**
 * A short-lived CSS-keyframe burst that paints over the tile where a word
 * was just submitted. Gives the grid a tactile "pop" on accept/reject/duplicate.
 * Pure CSS animation; no JS motion libraries.
 */
export function GridSubmitBurst({ row, col, type, onDone }: GridSubmitBurstProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone?.();
    }, 460);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid-submit-burst',
        type === 'accepted' && 'grid-submit-burst--accepted',
        type === 'rejected' && 'grid-submit-burst--rejected',
        (type === 'duplicate' || type === 'foundByOther') && 'grid-submit-burst--duplicate'
      )}
      style={{
        gridColumnStart: col + 1,
        gridColumnEnd: col + 2,
        gridRowStart: row + 1,
        gridRowEnd: row + 2,
      }}
    />
  );
}

export default React.memo(GridSubmitBurst);
