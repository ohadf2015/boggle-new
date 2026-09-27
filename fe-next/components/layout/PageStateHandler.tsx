'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface PageStateHandlerProps {
  /** Whether content is loading */
  isLoading: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the data is empty (show empty state) */
  isEmpty?: boolean;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: React.ReactNode;
  /** Custom empty state component */
  emptyComponent?: React.ReactNode;
  /** Loading text */
  loadingText?: string;
  /** Empty state text */
  emptyText?: string;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Content to render when not loading/error/empty */
  children: React.ReactNode;
}

/**
 * PageStateHandler - Handles loading, error, and empty states for pages
 *
 * Provides consistent UI for:
 * - Loading spinner with message
 * - Error state with retry button
 * - Empty state with customizable message
 *
 * Falls through to children when none of the above states apply.
 *
 * @example
 * <PageStateHandler
 *   isLoading={loading}
 *   error={error}
 *   onRetry={refetch}
 * >
 *   <PageContent data={data} />
 * </PageStateHandler>
 */
export function PageStateHandler({
  isLoading,
  error,
  isEmpty = false,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  loadingText,
  emptyText,
  emptyIcon,
  children,
}: PageStateHandlerProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <PageLoader
          size="md"
          text={loadingText || t('common.loading')}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle
          className={cn(
            'w-16 h-16 mb-4',
            isDarkMode ? 'text-red-400' : 'text-red-500'
          )}
        />
        <p
          className={cn(
            'text-lg font-medium mb-2',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}
        >
          {t('common.error')}
        </p>
        <p
          className={cn(
            'text-sm mb-4 text-center max-w-md',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}
        >
          {error}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            className={cn(
              'flex items-center gap-2',
              isDarkMode
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-cyan-500 hover:bg-cyan-600 text-white'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.retry')}
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }

    return (
      <EnhancedEmptyState
        title={emptyText || t('common.noData')}
        mascotVariant="happy"
      />
    );
  }

  // Render children when no special state
  return <>{children}</>;
}

export default PageStateHandler;
