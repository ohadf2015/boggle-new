'use client';

import React from 'react';
import AutoHideHeader from '@/components/AutoHideHeader';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useTheme } from '@/utils/ThemeContext';
import { usePullToRefresh, type PullToRefreshOptions } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  /** Callback for pull-to-refresh. If not provided, pull-to-refresh is disabled. */
  onRefresh?: () => Promise<void>;
  /** Whether to show the auto-hide header. Default: true */
  showHeader?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Max width constraint. Default: '4xl' */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  /** Padding size. Default: 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Pull-to-refresh threshold in pixels. Default: 60 */
  pullThreshold?: number;
  /** Override dark mode detection */
  forceDarkMode?: boolean;
  /** Add bottom padding to account for mobile bottom nav. Default: true on mobile */
  bottomNavAware?: boolean;
  /** Use full viewport height with no internal scroll. Default: false */
  fullHeight?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'px-2 py-4',
  md: 'px-4 py-6',
  lg: 'px-6 py-8',
};

/**
 * PageLayout - Unified page wrapper component
 *
 * Provides:
 * - Consistent dark/light mode background
 * - Auto-hide header
 * - Pull-to-refresh functionality
 * - Responsive max-width and padding
 *
 * @example
 * <PageLayout onRefresh={refreshData}>
 *   <h1>Page Content</h1>
 * </PageLayout>
 */
export function PageLayout({
  children,
  onRefresh,
  showHeader = true,
  className,
  maxWidth = '4xl',
  padding = 'md',
  pullThreshold = 60,
  forceDarkMode,
  bottomNavAware = true,
  fullHeight = false,
}: PageLayoutProps) {
  const { theme } = useTheme();
  const isDarkMode = forceDarkMode ?? theme === 'dark';

  // Only enable pull-to-refresh if onRefresh is provided
  const pullToRefreshOptions: PullToRefreshOptions = {
    onRefresh: onRefresh || (async () => {}),
    threshold: pullThreshold,
    enabled: !!onRefresh,
  };

  const { pullToRefreshHandlers, pullState } = usePullToRefresh(pullToRefreshOptions);

  return (
    <div
      className={cn(
        'flex flex-col relative',
        fullHeight ? 'h-full overflow-hidden' : 'min-h-full',
        isDarkMode
          ? 'bg-neo-navy'
          : 'bg-linear-to-br from-blue-50 via-white to-purple-50',
        className
      )}
      {...(onRefresh ? pullToRefreshHandlers : {})}
    >
      {/* Pull-to-refresh indicator */}
      {onRefresh && (
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={pullThreshold}
        />
      )}

      {/* Auto-hide header - sticky on mobile, static on desktop */}
      {showHeader && <AutoHideHeader />}

      {/* Page content with proper spacing */}
      <div
        className={cn(
          'flex-1 mx-auto w-full',
          fullHeight && 'min-h-0',
          bottomNavAware && 'pb-bottom-stack sm:pb-0',
          maxWidthClasses[maxWidth],
          paddingClasses[padding]
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default PageLayout;
