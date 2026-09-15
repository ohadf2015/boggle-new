'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, HelpCircle, Wifi } from 'lucide-react';
import logger from '@/utils/logger';
import {
  isChunkLoadError as isChunkLoadErrorNameMessage,
  clearCachesAndReload,
  claimChunkRecoveryGuard,
  clearChunkRecoveryGuard,
} from '@/lib/deploy/staleDeployReload';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/shared/types/game';

// ==========================================
// Translation Helper
// ==========================================

type TranslationFunction = (path: string, fallback?: string) => string;

/**
 * Get translation function for error boundaries
 * Tries to detect language from localStorage, falls back to 'en'
 */
function getTranslationFn(): TranslationFunction {
  let language: Language = 'en';

  // Try to get language from localStorage (safe for SSR)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('language');
      if (stored && ['en', 'he', 'sv', 'ja', 'es'].includes(stored)) {
        language = stored as Language;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return (path: string, fallback?: string): string => {
    try {
      const keys = path.split('.');
      let current: unknown = getCachedTranslation(language);
      for (const key of keys) {
        if (current === null || typeof current !== 'object') return fallback || path;
        current = (current as Record<string, unknown>)[key];
        if (current === undefined) return fallback || path;
      }
      return typeof current === 'string' ? current : (fallback || path);
    } catch {
      return fallback || path;
    }
  };
}

// ==========================================
// Chunk Load Error Detection (shared with #979 / t_9cc3561f recovery)
// ==========================================

/**
 * Detects if an error is a chunk loading failure (stale deployment).
 * Delegates to the shared matcher so every boundary agrees with ChunkErrorRecovery.
 */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  return isChunkLoadErrorNameMessage(error.name, error.message);
}

/**
 * Attempts auto-refresh for chunk errors via the shared cache-bust + SW purge path.
 * Returns true if refresh was triggered, false if the session guard already fired.
 */
function handleChunkErrorRefresh(): boolean {
  if (typeof window === 'undefined') return false;
  if (!claimChunkRecoveryGuard()) {
    logger.warn('[ChunkError] Skipping auto-refresh (recovery guard already set)');
    return false;
  }
  logger.info('[ChunkError] Auto-refreshing page to load new chunks (cache-bust)');
  void clearCachesAndReload();
  return true;
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

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const t = getTranslationFn();

  return (
    <Card className="m-4 border-neo-red/50 bg-neo-red/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-neo-red">
          <AlertTriangle className="w-5 h-5" />
          {t('errors.somethingWentWrong', 'Quick Timeout!')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neo-white">
          {t('errors.unexpectedError', "Tiny hiccup - but your game's totally safe!")}
        </p>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="p-2 bg-neo-black/20 rounded-neo text-xs">
            <summary className="cursor-pointer font-semibold">{t('errors.errorDetails', 'Details')}</summary>
            <pre className="mt-2 overflow-auto max-h-32 text-neo-red">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex gap-2">
          <Button onClick={onReset} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('common.retry', 'Try Again')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

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
    // Clear the shared guard so a manual retry can reclaim the recovery slot,
    // then use the same cache-bust + SW purge path as ChunkErrorRecovery.
    clearChunkRecoveryGuard();
    void clearCachesAndReload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { featureName, icon, showRetry = true, showHomeButton = false } = this.props;
      const isChunkError = isChunkLoadError(this.state.error);
      const t = getTranslationFn();

      // Special UI for chunk load errors (stale deployment)
      if (isChunkError) {
        return (
          <Card className="m-4 border-neo-cyan/50 bg-neo-cyan/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neo-cyan">
                <RefreshCw className="w-5 h-5" />
                {t('errors.updateHeading', 'Fresh Update Ready!')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-neo-white">
                {t('errors.updateMessage', "Cool new stuff just dropped! Quick refresh and you're back in.")}
              </p>
              <p className="text-xs text-neo-lime/80 flex items-center gap-1">
                <span>✓</span>
                {t('errors.updateProgress', 'Takes 2 seconds!')}
              </p>
              <Button onClick={this.handleHardRefresh} className="gap-2 bg-neo-cyan text-neo-black hover:bg-neo-cyan/80">
                <RefreshCw className="w-4 h-4" />
                {t('errors.refreshPage', 'Refresh')}
              </Button>
            </CardContent>
          </Card>
        );
      }

      // Check if this might be a connection issue
      const errorMsg = this.state.error?.message?.toLowerCase() || '';
      const isConnectionError = errorMsg.includes('network') ||
                                errorMsg.includes('fetch') ||
                                errorMsg.includes('connection') ||
                                errorMsg.includes('offline');

      return (
        <Card className="m-4 border-neo-yellow/50 bg-neo-yellow/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neo-yellow">
              {icon || (isConnectionError ? <Wifi className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />)}
              {t('errors.errorHeading', "Let's Get You Back!")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neo-white">
              {isConnectionError
                ? t('errors.connectionLost', 'Lost connection - reconnecting')
                : t('errors.errorMessage', "Quick glitch, but don't worry - your words are safe!")}
            </p>

            {/* Recovery guidance */}
            <div className="text-xs text-neo-lime/80 space-y-1">
              <p className="flex items-center gap-1">
                <span>✓</span>
                {t('errors.errorProgress', "Everything's saved!")}
              </p>
              {isConnectionError && (
                <p className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {t('errors.notConnected', "Can't reach the server")}
                </p>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="p-2 bg-neo-black/20 rounded-neo text-xs">
                <summary className="cursor-pointer font-semibold">{t('errors.errorDetails', 'Details')}</summary>
                <pre className="mt-2 overflow-auto max-h-32 text-neo-red">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 flex-wrap">
              {showRetry && (
                <Button onClick={this.handleReset} variant="outline" className="gap-2 border-neo-yellow text-neo-yellow hover:bg-neo-yellow/20">
                  <RefreshCw className="w-4 h-4" />
                  {t('common.retry', 'Try Again')}
                </Button>
              )}
              {showHomeButton && (
                <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                  <Home className="w-4 h-4" />
                  {t('common.backToHome', 'Back to Home')}
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
