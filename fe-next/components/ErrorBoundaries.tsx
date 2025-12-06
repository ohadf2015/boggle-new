'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaExclamationTriangle, FaRedo, FaHome, FaGamepad, FaChartBar, FaCog } from 'react-icons/fa';
import logger from '@/utils/logger';

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
        <FaExclamationTriangle />
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
        <FaRedo />
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

  render(): ReactNode {
    if (this.state.hasError) {
      const { featureName, icon, showRetry = true, showHomeButton = false } = this.props;

      return (
        <Card className="m-4 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              {icon || <FaExclamationTriangle />}
              {featureName} Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  <FaRedo />
                  Try again
                </Button>
              )}
              {showHomeButton && (
                <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                  <FaHome />
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

// ==========================================
// Pre-configured Feature Boundaries
// ==========================================

/**
 * Error boundary for game-related components
 */
export const GameErrorBoundary: React.FC<{ children: ReactNode; onReset?: () => void }> = ({
  children,
  onReset,
}) => (
  <FeatureErrorBoundary
    featureName="Game"
    icon={<FaGamepad />}
    showRetry={true}
    showHomeButton={true}
    onReset={onReset}
  >
    {children}
  </FeatureErrorBoundary>
);

/**
 * Error boundary for results/leaderboard components
 */
export const ResultsErrorBoundary: React.FC<{ children: ReactNode; onReset?: () => void }> = ({
  children,
  onReset,
}) => (
  <FeatureErrorBoundary
    featureName="Results"
    icon={<FaChartBar />}
    showRetry={true}
    showHomeButton={true}
    onReset={onReset}
  >
    {children}
  </FeatureErrorBoundary>
);

/**
 * Error boundary for settings/configuration components
 */
export const SettingsErrorBoundary: React.FC<{ children: ReactNode; onReset?: () => void }> = ({
  children,
  onReset,
}) => (
  <FeatureErrorBoundary
    featureName="Settings"
    icon={<FaCog />}
    showRetry={true}
    showHomeButton={false}
    onReset={onReset}
  >
    {children}
  </FeatureErrorBoundary>
);

/**
 * Inline error boundary for non-critical UI sections
 * Shows a minimal error state without disrupting the entire page
 */
export class InlineErrorBoundary extends Component<
  { children: ReactNode; fallbackMessage?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallbackMessage?: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('InlineErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
          {this.props.fallbackMessage || 'Unable to load this section'}
        </div>
      );
    }
    return this.props.children;
  }
}

// Export default for backwards compatibility
export default BaseErrorBoundary;
