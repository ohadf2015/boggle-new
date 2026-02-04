'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

// Props type needs to match the inner component
export interface PerformanceChartProps {
  /** Current game score to highlight */
  currentScore?: number;
  /** Number of games to display */
  gamesLimit?: number;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Class name for container */
  className?: string;
}

/**
 * PerformanceChart - Dynamically loaded wrapper
 * Recharts (~120KB) is only loaded when this component renders
 */
const PerformanceChart = dynamic<PerformanceChartProps>(
  () => import('./PerformanceChartInner'),
  {
    loading: () => <ChartSkeleton variant="line" height="h-48" />,
    ssr: false,
  }
);

export default PerformanceChart;
