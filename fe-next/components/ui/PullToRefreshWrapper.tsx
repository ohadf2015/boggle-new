'use client';

import React, { ReactNode } from 'react';
import { usePullToRefresh, PullToRefreshOptions } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { cn } from '@/lib/utils';

interface PullToRefreshWrapperProps {
  children: ReactNode;
  onRefresh: PullToRefreshOptions['onRefresh'];
  enabled?: boolean;
  threshold?: number;
  className?: string;
  indicatorClassName?: string;
}

/**
 * PullToRefreshWrapper - Wrapper component for easy pull-to-refresh integration
 *
 * Wraps content with pull-to-refresh functionality for mobile devices.
 * Includes visual indicator and haptic feedback.
 *
 * @example
 * <PullToRefreshWrapper
 *   onRefresh={async () => await refetchData()}
 *   enabled={!isPlaying}
 * >
 *   <YourContent />
 * </PullToRefreshWrapper>
 */
export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({
  children,
  onRefresh,
  enabled = true,
  threshold = 60,
  className,
  indicatorClassName,
}) => {
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  return (
    <div
      className={cn('relative', className)}
      {...pullToRefreshHandlers}
    >
      <PullToRefreshIndicator
        pullDistance={pullState.pullDistance}
        isRefreshing={pullState.isRefreshing}
        threshold={threshold}
        className={indicatorClassName}
      />
      {children}
    </div>
  );
};

export default PullToRefreshWrapper;
