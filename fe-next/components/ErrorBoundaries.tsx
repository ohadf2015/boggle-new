'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import logger from '@/utils/logger';

// ==========================================
// Chunk Load Error Detection
// ==========================================

const CHUNK_ERROR_REFRESH_KEY = 'lexiclash_chunk_error_refresh';
const CHUNK_ERROR_REFRESH_TIMEOUT_MS = 10000; // 10 seconds to prevent loops

/**
 * Detects if an error is a chunk loading failure (stale deployment)
 */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  return (
    name === 'chunkloaderror' ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('dynamically imported module')
  );
}

/**
 * Attempts auto-refresh for chunk errors, with loop prevention
 * Returns true if refresh was triggered, false if skipped (recent refresh)
 */
function handleChunkErrorRefresh(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const lastRefresh = sessionStorage.getItem(CHUNK_ERROR_REFRESH_KEY);
    const now = Date.now();

    if (lastRefresh) {
      const elapsed = now - parseInt(lastRefresh, 10);
      if (elapsed < CHUNK_ERROR_REFRESH_TIMEOUT_MS) {
        // Recently refreshed, don't loop
        logger.warn('[ChunkError] Skipping auto-refresh (recent refresh detected)');
        return false;
      }
    }

    // Mark refresh timestamp and reload
    sessionStorage.setItem(CHUNK_ERROR_REFRESH_KEY, now.toString());
    logger.info('[ChunkError] Auto-refreshing page to load new chunks');
    window.location.reload();
    return true;
  } catch {
    // sessionStorage not available, skip auto-refresh
    return false;
  }
}

/**
 * Base ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Feature-specific error boundary configuration
 */
interface FeatureErrorBoundaryProps extends ErrorBoundaryProps {
  featureName: string;
  icon?: ReactNode;
  showRetry?: boolean;
  showHomeButton?: boolean;
}

// ==========================================
// Base Error Boundary
// ==========================================

export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    // Auto-refresh for chunk loading errors (stale deployment)
    if (isChunkLoadError(error)) {
      logger.info('[BaseErrorBoundary] Chunk load error detected, attempting auto-refresh');
      const refreshed = handleChunkErrorRefresh();
      if (refreshed) {
        return;
      }
    }

    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// ==========================================
// Default Error Fallback
// ==========================================

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => (
  <Card className="m-4 border-red-500/50 bg-red-50 dark:bg-red-900/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertTriangle className="w-5 h-5" />
        Something went wrong
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {process.env.NODE_ENV === 'development' && error && (
        <pre className="p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-auto max-h-32">
          {error.message}
        </pre>
      )}
      <Button onClick={onReset} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Try again
      </Button>
    </CardContent>
  </Card>
);

// ==========================================
// Feature-Specific Error Boundary
// ==========================================

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error(`[${this.props.featureName}] Error:`, error, errorInfo);

    // Auto-refresh for chunk loading errors (stale deployment)
    if (isChunkLoadError(error)) {
      logger.info(`[${this.props.featureName}] Chunk load error detected, attempting auto-refresh`);
      const refreshed = handleChunkErrorRefresh();
      if (refreshed) {
        // Page is refreshing, don't update state
        return;
      }
      // If refresh was skipped (recent refresh), fall through to show error UI
    }

    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleHardRefresh = (): void => {
    // Clear the chunk error flag to allow refresh
    try {
      sessionStorage.removeItem(CHUNK_ERROR_REFRESH_KEY);
    } catch {
      // Ignore sessionStorage errors
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { featureName, icon, showRetry = true, showHomeButton = false } = this.props;
      const isChunkError = isChunkLoadError(this.state.error);

      // Special UI for chunk load errors (stale deployment)
      if (isChunkError) {
        return (
          <Card className="m-4 border-blue-500/50 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-5 h-5" />
                Update Available
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                A new version of LexiClash is available. Please refresh to continue playing.
              </p>
              <Button onClick={this.handleHardRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        );
      }

      return (
        <Card className="m-4 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              {icon || <AlertTriangle className="w-5 h-5" />}
              {featureName} Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              We encountered an issue with {featureName.toLowerCase()}. This has been logged for review.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-xs">
                <summary className="cursor-pointer font-semibold">Error Details</summary>
                <pre className="mt-2 overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              {showRetry && (
                <Button onClick={this.handleReset} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              )}
              {showHomeButton && (
                <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// Export default for backwards compatibility
export default BaseErrorBoundary;
