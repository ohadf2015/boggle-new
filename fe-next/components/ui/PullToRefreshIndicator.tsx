'use client';

import React, { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
  className?: string;
}

/**
 * PullToRefreshIndicator - Visual feedback for pull-to-refresh
 *
 * Shows a rotating refresh icon that indicates pull progress
 * Memoized to prevent unnecessary re-renders
 */
export const PullToRefreshIndicator = memo<PullToRefreshIndicatorProps>(({
  pullDistance,
  isRefreshing,
  threshold,
  className,
}) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const isAtThreshold = progress >= 1;
  const isVisible = pullDistance > 5 || isRefreshing;

  return (
    <AdaptiveAnimatePresence>
      {isVisible && (
        <AdaptiveMotion.div
          className={cn(
            'absolute top-0 left-0 right-0 flex justify-center items-center z-[70] pointer-events-none',
            className
          )}
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: Math.max(pullDistance, isRefreshing ? threshold : 0),
          }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <AdaptiveMotion.div
            className={cn(
              'rounded-full p-2.5 shadow-lg border-2 transition-colors duration-200',
              isAtThreshold || isRefreshing
                ? 'bg-neo-pink border-neo-pink text-white'
                : 'bg-white dark:bg-neo-navy border-gray-300 dark:border-slate-600'
            )}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: isRefreshing ? 1.1 : 0.8 + progress * 0.4,
              opacity: 1,
              rotate: isRefreshing ? 360 : progress * 180,
            }}
            transition={{
              scale: { type: 'spring', stiffness: 400, damping: 25 },
              rotate: isRefreshing
                ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                : { type: 'spring', stiffness: 200, damping: 20 },
            }}
          >
            {isAtThreshold || isRefreshing ? (
              <RefreshCw className="w-5 h-5" />
            ) : (
              <ArrowDown
                className={cn(
                  'w-5 h-5 transition-colors',
                  progress > 0.5 ? 'text-neo-pink' : 'text-gray-400 dark:text-gray-500'
                )}
              />
            )}
          </AdaptiveMotion.div>

          {/* Release text hint */}
          {isAtThreshold && !isRefreshing && (
            <AdaptiveMotion.span
              className="absolute bottom-1 text-xs font-medium text-neo-pink dark:text-neo-cyan"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Release to refresh
            </AdaptiveMotion.span>
          )}
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';
