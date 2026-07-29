'use client';

import { cn } from '@/lib/utils';

interface ChartSkeletonProps {
  className?: string;
  height?: string;
  variant?: 'radar' | 'line' | 'bar' | 'area';
}

/**
 * Loading skeleton for chart components
 * Used while Recharts is being dynamically imported
 */
export function ChartSkeleton({
  className,
  height = 'h-64',
  variant = 'line'
}: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden',
        'bg-neo-navy',
        className
      )}
    >
      <div className="p-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-neo-cyan/30" />
          <div className="h-4 w-32 rounded bg-white/20" />
        </div>

        {/* Chart area skeleton */}
        <div className={cn('relative w-full', height)}>
          {variant === 'radar' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-4 border-white/10 border-dashed animate-spin-slow" />
            </div>
          )}

          {(variant === 'line' || variant === 'area') && (
            <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
              {[40, 60, 45, 70, 55, 80, 65].map((h, i) => (
                <div
                  key={`line-${h}`}
                  className="w-2 bg-linear-to-t from-neo-cyan/30 to-neo-pink/30 rounded-t animate-pulse"
                  style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          )}

          {variant === 'bar' && (
            <div className="absolute inset-0 flex items-end justify-around px-4 pb-4 gap-2">
              {[50, 70, 40, 80, 60].map((h, i) => (
                <div
                  key={`bar-${h}`}
                  className="flex-1 bg-neo-cyan/20 rounded-t animate-pulse"
                  style={{ height: `${h}%`, animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={`stat-${i}`} className="bg-white/10 rounded-neo border border-white/20 p-2">
              <div className="h-6 w-12 mx-auto rounded bg-white/20 mb-1" />
              <div className="h-3 w-16 mx-auto rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChartSkeleton;
