'use client';

import { memo } from 'react';
import type { PerformanceTrend } from '@/utils/gameHistoryManager';

interface MiniSparklineProps {
  data: number[];
  trend?: PerformanceTrend | null;
  width?: number;
  height?: number;
  /** 'dark' for dark backgrounds (white glow), 'light' for cream/white backgrounds */
  variant?: 'dark' | 'light';
}

const TREND_COLORS = {
  dark: { up: '#a3e635', down: '#f87171', stable: '#22d3ee' },    // neo-lime, neo-red, neo-cyan
  light: { up: '#65a30d', down: '#dc2626', stable: '#0891b2' },   // lime-600, red-600, cyan-600
} as const;

/**
 * MiniSparkline - Tiny SVG line chart for performance history.
 *
 * Used by ResultsInfoCards (light bg); `variant` picks the color intensities
 * for the surrounding surface.
 */
export const MiniSparkline = memo(function MiniSparkline({
  data,
  trend,
  width = 70,
  height = 32,
  variant = 'dark',
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const padding = variant === 'light' ? 3 : 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const minVal = Math.min(...data) * 0.9;
  const range = (Math.max(...data) * 1.1 - minVal) || 1;

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * chartW;
      const y = padding + chartH - ((val - minVal) / range) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = padding + chartW;
  const lastY = padding + chartH - ((data[data.length - 1] - minVal) / range) * chartH;

  const palette = TREND_COLORS[variant];
  const color = trend?.direction === 'up' ? palette.up
    : trend?.direction === 'down' ? palette.down
    : palette.stable;

  const bgStroke = variant === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const dotStroke = variant === 'dark' ? 'white' : 'black';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={bgStroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={variant === 'light' ? 3.5 : 3}
        fill={color}
        stroke={dotStroke}
        strokeWidth="1.5"
      />
    </svg>
  );
});
