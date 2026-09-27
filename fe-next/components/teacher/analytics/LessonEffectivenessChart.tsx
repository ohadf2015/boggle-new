'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

// Props type needs to match the inner component
interface LessonEffectivenessChartProps {
  classroomId: string;
}

/**
 * LessonEffectivenessChart - Dynamically loaded wrapper
 * Recharts (~120KB) is only loaded when this component renders
 */
const LessonEffectivenessChart = dynamic<LessonEffectivenessChartProps>(
  () => import('./LessonEffectivenessChartInner').then(mod => mod.LessonEffectivenessChart),
  {
    loading: () => <ChartSkeleton variant="bar" height="h-80" />,
    ssr: false,
  }
);

export default LessonEffectivenessChart;
