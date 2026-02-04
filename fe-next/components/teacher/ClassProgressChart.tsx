'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

/**
 * ClassProgressChart - Dynamically loaded wrapper
 * Recharts (~120KB) is only loaded when this component renders
 */
const ClassProgressChart = dynamic(
  () => import('./ClassProgressChartInner'),
  {
    loading: () => <ChartSkeleton variant="line" height="h-80" />,
    ssr: false,
  }
);

export default ClassProgressChart;
