'use client';

import React from 'react';
import { translations } from '../../translations';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const language = (typeof window !== 'undefined' && localStorage.getItem('boggle_language')) || 'en';
      const t = (path) => {
        try {
          const keys = path.split('.');
          let current = translations[language];
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
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="max-w-xl w-full text-center p-6 rounded-2xl bg-slate-800/90 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
            <h1 className="text-2xl font-bold mb-3 text-rose-400">
              {t('errors.somethingWentWrong')}
            </h1>
            <p className="text-sm text-slate-300 mb-4">
              {t('errors.unexpectedError')}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left bg-slate-900/60 p-3 rounded-lg text-xs">
                <summary className="cursor-pointer mb-2 text-amber-400">
                  {t('errors.errorDetails')}
                </summary>
                <pre className="overflow-x-auto text-rose-400 m-0">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="overflow-x-auto text-slate-400 mt-2 text-[11px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-2 text-sm font-semibold rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white"
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
