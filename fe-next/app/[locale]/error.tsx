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
    message.includes('dynamically imported module') ||
    message.includes('_next/static/chunks') ||
    message.includes('module 964893') || // Specific error from report
    message.includes('failed to fetch')
  );
}

async function clearCachesAndReload(): Promise<void> {
  // Clear all service worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  // Unregister service workers to get fresh version
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }

  // Force hard reload (bypass cache)
  window.location.reload();
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
        // Clear caches and reload to get fresh chunks
        clearCachesAndReload();
        return;
      }
      // Already tried refreshing once - clear the flag for next time
      sessionStorage.removeItem('chunk_error_refresh');
    }

    console.error('Page error:', error);
    captureError(error, {
      errorBoundary: {
        type: 'page-error',
        digest: error.digest,
        isChunkError: isChunkLoadError(error),
      },
    });
  }, [error]);

  const handleRefresh = () => {
    // For chunk errors, clear caches before reloading
    if (isChunkLoadError(error)) {
      clearCachesAndReload();
    } else {
      reset();
    }
  };

  const isChunkError = isChunkLoadError(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{isChunkError ? '🔄' : '😵'}</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isChunkError ? 'Update Available' : 'Something went wrong!'}
        </h2>
        <p className="text-gray-400 mb-6">
          {isChunkError
            ? 'A new version of the app is available. Please refresh to continue.'
            : error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="px-5 py-2 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all"
          >
            {isChunkError ? 'Refresh Now' : 'Try again'}
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
