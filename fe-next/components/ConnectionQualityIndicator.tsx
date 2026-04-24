/**
 * ConnectionQualityIndicator - Signal bars showing connection quality
 *
 * Displays 3 bars that fill based on quality level:
 * - excellent: hidden (don't clutter UI)
 * - good: 2 bars filled (yellow)
 * - poor: 1 bar filled (orange)
 * - critical: 0 bars filled, all flash red
 * - disconnected: hidden (ConnectionBanner handles this)
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ConnectionQualityIndicatorProps {
  quality: 'excellent' | 'good' | 'poor' | 'critical' | 'disconnected';
  averageRtt: number;
  className?: string;
}

const BAR_HEIGHTS = ['h-2', 'h-3', 'h-4'];
const TOTAL_BARS = 3;

function getFilledCount(quality: string): number {
  switch (quality) {
    case 'good': return 2;
    case 'poor': return 1;
    case 'critical': return 0;
    default: return 3;
  }
}

function getBarColor(quality: string, isFilled: boolean): string {
  if (quality === 'critical') return 'bg-neo-red animate-pulse';
  if (!isFilled) return 'bg-neo-black/20';
  switch (quality) {
    case 'good': return 'bg-neo-yellow';
    case 'poor': return 'bg-neo-orange';
    default: return 'bg-neo-lime';
  }
}

export const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({
  quality,
  averageRtt,
  className,
}) => {
  // Hide when disconnected (ConnectionBanner handles it) or excellent (no clutter)
  if (quality === 'disconnected' || quality === 'excellent') {
    return null;
  }

  const filledCount = getFilledCount(quality);

  return (
    <div
      role="status"
      aria-label={`Connection ${quality} — ${averageRtt}ms`}
      className={cn(
        'inline-flex items-end gap-0.5',
        className
      )}
    >
      {Array.from({ length: TOTAL_BARS }, (_, i) => {
        const isFilled = i < filledCount;
        return (
          <div
            key={`bar-${i}`}
            data-testid={`signal-bar-${i}`}
            data-filled={isFilled ? 'true' : 'false'}
            className={cn(
              'w-1.5 rounded-sm border border-neo-black/30',
              BAR_HEIGHTS[i],
              getBarColor(quality, isFilled)
            )}
          />
        );
      })}
    </div>
  );
};

export default ConnectionQualityIndicator;
