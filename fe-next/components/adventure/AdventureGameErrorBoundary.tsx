/**
 * AdventureGameErrorBoundary
 *
 * Game-specific error boundary that catches crashes during gameplay
 * and offers "Return to level select" + "Retry" options instead of
 * killing the entire Adventure Mode.
 */
'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import logger from '@/utils/logger';

interface Props {
  children: ReactNode;
  onExit: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/** Functional wrapper to provide translations to the class component fallback */
function GameErrorFallback({ onExit, onRetry, error }: { onExit: () => void; onRetry: () => void; error: Error | null }) {
  const { t } = useLanguageSafe();

  return (
    <div
      role="alert"
      className="h-full w-full flex items-center justify-center bg-neo-navy p-6"
    >
      <div className="max-w-sm w-full bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard-lg p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-neo-red/20 rounded-full flex items-center justify-center border-3 border-neo-red/40">
          <AlertTriangle className="w-7 h-7 text-neo-red" />
        </div>

        <h2 className="text-neo-white font-neo-display font-black text-lg mb-2">
          {t('adventure.gameError.title')}
        </h2>
        <p className="text-neo-white text-sm mb-6">
          {t('adventure.gameError.description')}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <pre className="text-neo-red/80 text-xs text-start mb-4 p-2 bg-neo-black/30 rounded overflow-auto max-h-24">
            {error.message}
          </pre>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-neo-yellow text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            {t('adventure.gameError.retry')}
          </button>
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-neo-navy text-neo-white font-bold border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('adventure.gameError.returnToLevels')}
          </button>
        </div>
      </div>
    </div>
  );
}

export class AdventureGameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('[AdventureGame] Crash caught by error boundary:', error, errorInfo);
  }

  handleRetry = (): void => {
    // Increment retryCount to change the key on children, forcing a full
    // remount. This resets all useReducer state, refs (isSubmittingRef,
    // hasTriggered, completionSavedRef, etc.) that would otherwise persist.
    this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <GameErrorFallback
          onExit={this.props.onExit}
          onRetry={this.handleRetry}
          error={this.state.error}
        />
      );
    }
    // Key forces full remount on retry — resets all hooks, refs, and reducer state
    return <div key={this.state.retryCount}>{this.props.children}</div>;
  }
}
