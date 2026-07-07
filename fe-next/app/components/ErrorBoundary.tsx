'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { m } from 'framer-motion';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import logger from '@/utils/logger';
import { captureError } from '@/utils/sentry';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { ErrorState } from '@/components/ui/EnhancedEmptyState';

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
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
 * Translation function type
 */
type TranslationFunction = (path: string) => string;

/**
 * ErrorBoundary Component
 * Catches and handles React errors gracefully
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Skip Sentry capture for chunk load errors (stale deployment)
    // These are already filtered in ignoreErrors but bypass it via captureMessage
    if (this.isChunkLoadError(error)) {
      this.setState({ error, errorInfo });
      return;
    }

    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    captureError(error, {
      react: {
        componentStack: errorInfo.componentStack,
      },
      errorBoundary: {
        type: 'react-error-boundary',
      },
    });

    this.setState({
      error,
      errorInfo
    });
  }

  isChunkLoadError(error: Error | null): boolean {
    if (!error) return false;
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    if (name === 'chunkloaderror') return true;
    return (
      message.includes('loading chunk') ||
      message.includes('loading css chunk') ||
      message.includes('failed to load chunk') ||
      (message.includes('failed to fetch dynamically imported module') && message.includes('_next/'))
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Always use 'en' for error boundary - accessing localStorage here causes hydration issues
      // The error boundary is a fallback UI, so using a consistent language is acceptable
      const language = 'en';
      const t: TranslationFunction = (path: string): string => {
        try {
          const keys = path.split('.');
          let current: unknown = getCachedTranslation(language as Language);
          for (const key of keys) {
            if (current === null || typeof current !== 'object') return path;
            current = (current as Record<string, unknown>)[key];
            if (current === undefined) return path;
          }
          return typeof current === 'string' ? current : path;
        } catch {
          return path;
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-neo-navy">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full"
          >
            <ErrorState
              title={t('errors.somethingWentWrong')}
              description={t('errors.unexpectedError')}
              onRetry={this.handleReset}
            />
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-start bg-neo-navy-light p-3 rounded-neo border-2 border-neo-black/30 text-xs">
                <summary className="cursor-pointer mb-2 text-neo-cyan font-bold">
                  {t('errors.errorDetails')}
                </summary>
                <pre className="overflow-x-auto text-neo-red m-0">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="overflow-x-auto text-neo-white mt-2 text-[11px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </m.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
