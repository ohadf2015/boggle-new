'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import logger from '@/utils/logger';

/**
 * FeatureErrorBoundary Props
 * More flexible error boundary for specific features
 */
interface FeatureErrorBoundaryProps {
  children: ReactNode;
  /** Name of the feature for logging */
  featureName: string;
  /** Custom fallback UI - if not provided, uses default minimal UI */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom reset behavior */
  onReset?: () => void;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * FeatureErrorBoundary Component
 *
 * Granular error boundary for specific features.
 * Unlike the root ErrorBoundary, this allows features to fail independently
 * without crashing the entire application.
 *
 * @example
 * <FeatureErrorBoundary featureName="GameBoard">
 *   <GridComponent />
 * </FeatureErrorBoundary>
 */
class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { featureName, onError } = this.props;

    logger.error(`[FeatureErrorBoundary:${featureName}] Error caught:`, error);
    logger.debug(`[FeatureErrorBoundary:${featureName}] Component stack:`, errorInfo.componentStack);

    if (onError) {
      onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    const { onReset } = this.props;
    this.setState({ hasError: false, error: null });
    if (onReset) {
      onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, featureName, fallback } = this.props;

    if (hasError && error) {
      // Custom fallback (function or element)
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // Default minimal fallback UI
      return (
        <div className="p-4 bg-neo-cream border-3 border-neo-black rounded-neo text-center">
          <div className="text-3xl mb-2">😔</div>
          <p className="text-sm text-neo-black mb-3">
            Something went wrong with {featureName}.
          </p>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-neo-yellow border-3 border-neo-black rounded-neo font-bold text-sm hover:translate-y-[-2px] transition-transform"
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-3 text-left text-xs">
              <summary className="cursor-pointer text-neo-red font-bold">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-neo-navy text-neo-cream rounded overflow-auto max-h-32">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

export default FeatureErrorBoundary;
