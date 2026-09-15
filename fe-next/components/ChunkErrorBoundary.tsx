'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  isChunkLoadError,
  clearCachesAndReload,
  claimChunkRecoveryGuard,
  clearChunkRecoveryGuard,
} from '@/lib/deploy/staleDeployReload';

/**
 * Lightweight React error boundary dedicated to stale-chunk / CDN-missing
 * ChunkLoadError (t_9cc3561f — still hot after #979).
 *
 * Why a separate boundary: `app/[locale]/error.tsx` only catches errors in the
 * segment tree; FeatureErrorBoundary historically bare-reloaded with a private
 * sessionStorage key. This boundary:
 *  - uses the shared matcher + cache-bust + SW purge path
 *  - renders a dependency-free emoji fallback (no lucide / motion / lazy chunks)
 *  - wraps `{children}` in the locale layout so render-time chunk throws recover
 *    even when they never become window `error` / `unhandledrejection` events
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (!isChunkLoadError(error.name, error.message)) return;
    if (!claimChunkRecoveryGuard()) return;
    void clearCachesAndReload();
  }

  private handleRefresh = (): void => {
    clearChunkRecoveryGuard();
    void clearCachesAndReload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkLoadError(error.name, error.message);

    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-neo-navy">
        <div className="neo-card max-w-lg w-full p-8 text-center bg-neo-cream border-4 border-neo-black shadow-hard-xl">
          <div className="mb-6 flex justify-center" aria-hidden="true">
            <span className="text-7xl leading-none select-none">{chunk ? '✨' : '😵‍💫'}</span>
          </div>
          <h2 className="text-3xl font-black text-neo-black mb-3 uppercase tracking-wide font-neo-display">
            {chunk ? 'Fresh Update Ready!' : 'Quick Timeout!'}
          </h2>
          <p className="text-neo-gray text-lg mb-8 leading-relaxed">
            {chunk
              ? "Cool new stuff just dropped! Quick refresh and you're back in."
              : "Tiny hiccup — tap refresh and we'll get you back."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button type="button" onClick={this.handleRefresh} className="btn-neo-primary px-6 py-3 text-lg">
              ✨ Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="btn-neo-secondary px-6 py-3 text-lg"
            >
              🏠 Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ChunkErrorBoundary;
