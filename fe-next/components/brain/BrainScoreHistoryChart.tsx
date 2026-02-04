'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';
import type { BrainScoreHistory } from '@/shared/types/cognitive';

// Props type needs to match the inner component
interface BrainScoreHistoryChartProps {
  history: BrainScoreHistory[];
  className?: string;
}

/**
 * BrainScoreHistoryChart - Dynamically loaded wrapper
 * Recharts (~120KB) is only loaded when this component renders
 */
const BrainScoreHistoryChart = dynamic<BrainScoreHistoryChartProps>(
  () => import('./BrainScoreHistoryChartInner'),
  {
    loading: () => <ChartSkeleton variant="area" height="h-48" />,
    ssr: false,
  }
);

export default BrainScoreHistoryChart;
