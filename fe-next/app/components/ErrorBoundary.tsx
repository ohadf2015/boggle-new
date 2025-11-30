'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { translations } from '../../translations';
import logger from '@/utils/logger';

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

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
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
          let current: any = translations[language as keyof typeof translations];
          for (const key of keys) {
            current = current[key];
            if (current === undefined) return path;
          }
          return current;
        } catch {
          return path;
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-neo-navy text-neo-white">
          <div className="max-w-xl w-full text-center p-6 neo-card bg-neo-cream text-neo-black rotate-[-1deg]">
            <div className="text-5xl mb-4">😵</div>
            <h1 className="text-2xl font-black mb-3 uppercase tracking-wide text-neo-red">
              {t('errors.somethingWentWrong')}
            </h1>
            <p className="text-sm mb-4">
              {t('errors.unexpectedError')}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left bg-neo-navy p-3 rounded-neo border-3 border-neo-black text-xs">
                <summary className="cursor-pointer mb-2 text-neo-yellow font-bold">
                  {t('errors.errorDetails')}
                </summary>
                <pre className="overflow-x-auto text-neo-red m-0">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="overflow-x-auto text-neo-cream mt-2 text-[11px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="btn-neo-primary px-6 py-3"
              aria-label={t('errors.refreshPage')}
            >
              {t('errors.refreshPage')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
