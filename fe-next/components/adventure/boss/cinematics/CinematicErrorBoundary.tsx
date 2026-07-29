/**
 * CinematicErrorBoundary Component
 *
 * Error boundary specifically for Remotion cinematic playback.
 * Catches rendering errors and provides graceful fallbacks.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { AlertTriangle, RefreshCw, SkipForward } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';

// ============================================
// TYPES
// ============================================

interface Props {
  children: ReactNode;
  onSkip: () => void;
  testId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================

export class CinematicErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Cinematic Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleSkip = (): void => {
    this.props.onSkip();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onSkip={this.handleSkip}
          testId={this.props.testId}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================
// ERROR FALLBACK UI
// ============================================

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onSkip: () => void;
  testId?: string;
}

function ErrorFallback({ error, onRetry, onSkip, testId }: ErrorFallbackProps) {
  const { t } = useLanguageSafe();

  return (
    <div
      className="fixed inset-0 z-50 bg-neo-navy flex items-center justify-center p-4"
      data-testid={`${testId}-error`}
    >
      <AdaptiveMotion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-neo-white rounded-neo border-4 border-neo-black shadow-hard-lg p-6"
      >
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-neo-pink/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-neo-pink" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-neo-display font-black text-neo-black text-center mb-2">
          {t('adventure.bosses.cinematics.errorTitle')}
        </h2>

        {/* Description */}
        <p className="text-neo-black/70 text-center mb-4">
          {t('adventure.bosses.cinematics.errorDescription')}
        </p>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-3 bg-neo-black/5 rounded-neo text-xs font-mono text-neo-black/60 overflow-auto max-h-32">
            <p className="font-bold">{error.name}:</p>
            <p>{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neo-cyan text-neo-black rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-sm active:translate-y-1 transition-all font-neo-display font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            {t('adventure.bosses.cinematics.retry')}
          </button>
          <button
            onClick={onSkip}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neo-yellow text-neo-black rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-sm active:translate-y-1 transition-all font-neo-display font-bold"
          >
            <SkipForward className="w-4 h-4" />
            {t('adventure.bosses.cinematics.skip')}
          </button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
}

export default CinematicErrorBoundary;
