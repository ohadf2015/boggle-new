'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

// Props type needs to match the inner component
interface CognitiveRadarChartProps {
  domains: {
    processingSpeed: { score: number };
    workingMemory: { score: number };
    attention: { score: number };
    flexibility: { score: number };
    vocabulary: { score: number };
  };
}

/**
 * CognitiveRadarChart - Dynamically loaded wrapper
 * Recharts (~120KB) is only loaded when this component renders
 */
const CognitiveRadarChart = dynamic<CognitiveRadarChartProps>(
  () => import('./CognitiveRadarChartInner'),
  {
    loading: () => <ChartSkeleton variant="radar" height="h-[320px]" />,
    ssr: false,
  }
);

export default CognitiveRadarChart;
