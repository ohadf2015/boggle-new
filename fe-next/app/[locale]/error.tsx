'use client';

import { useEffect } from 'react';
import { captureError } from '@/utils/sentry';

function isChunkLoadError(error: Error): boolean {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  return (
    name === 'chunkloaderror' ||
    message.includes('loading chunk') ||
    message.includes('failed to load chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module')
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-refresh on chunk load errors (stale deployment cache)
    if (isChunkLoadError(error)) {
      const hasRefreshed = sessionStorage.getItem('chunk_error_refresh');
      if (!hasRefreshed) {
        sessionStorage.setItem('chunk_error_refresh', 'true');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem('chunk_error_refresh');
    }

    console.error('Page error:', error);
    captureError(error, {
      errorBoundary: {
        type: 'page-error',
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2 rounded-lg font-bold border border-slate-600 text-gray-300 hover:bg-slate-700 transition-all"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
