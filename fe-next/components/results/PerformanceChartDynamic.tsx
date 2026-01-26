'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Dynamic import with loading skeleton
const PerformanceChartLazy = dynamic(() => import('./PerformanceChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Charts use localStorage, client-only
});

// Loading skeleton that matches the chart's neo-brutalist style
function ChartSkeleton() {
  return (
    <div
      className={cn(
        'bg-neo-navy',
        'border-4 border-neo-black rounded-neo-lg shadow-hard-lg overflow-hidden',
        'animate-pulse'
      )}
      style={{ transform: 'rotate(-0.5deg)' }}
    >
      {/* Halftone texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
        }}
      />

      <div className="relative z-10 p-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-neo-cyan/30 rounded" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
          <div className="h-6 w-16 bg-white/10 rounded-neo" />
        </div>

        {/* Chart area skeleton */}
        <div className="h-48 bg-white/5 rounded-neo border border-white/10 mb-3" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 rounded-neo border border-white/10 p-2 text-center">
              <div className="w-5 h-5 bg-white/10 rounded mx-auto mb-1" />
              <div className="h-6 w-12 bg-white/10 rounded mx-auto mb-1" />
              <div className="h-3 w-16 bg-white/10 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-export with same props interface
export type { PerformanceChartProps } from './PerformanceChart';
export default PerformanceChartLazy;
