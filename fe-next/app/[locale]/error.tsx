'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { translations } from '../../translations';

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
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // Helper function to get translation
  const t = (path: string): string => {
    try {
      const keys = path.split('.');
      let current: unknown = translations[locale as keyof typeof translations] || translations.en;
      for (const key of keys) {
        current = (current as Record<string, unknown>)[key];
        if (current === undefined) return path;
      }
      return current as string;
    } catch {
      return path;
    }
  };
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-lime-50 to-cyan-100 px-4 py-8">
      <div className="neo-card max-w-lg w-full p-8 text-center animate-neo-pop rotate-[-1deg]">
        {/* Floating icon with gentle animation */}
        <div className="text-7xl mb-6 animate-pulse">
          {isChunkError ? '🔄' : '🌟'}
        </div>

        <h2 className="text-3xl font-black text-neo-black mb-3 uppercase tracking-wide font-neo-display">
          {isChunkError ? t('errors.updateHeading') : t('errors.errorHeading')}
        </h2>

        <p className="text-neo-gray text-lg mb-8 leading-relaxed">
          {isChunkError
            ? t('errors.updateMessage')
            : error.message || t('errors.errorMessage')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRefresh}
            className="btn-neo-primary px-6 py-3 text-lg"
          >
            {isChunkError ? `✨ ${t('errors.refreshPage')}` : `🔄 ${t('common.retry')}`}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-neo-secondary px-6 py-3 text-lg"
          >
            🏠 {t('common.back')}
          </button>
        </div>

        {/* Subtle encouragement */}
        <p className="text-neo-gray text-sm mt-6 opacity-75">
          {isChunkError ? t('errors.updateProgress') : t('errors.errorProgress')}
        </p>
      </div>
    </div>
  );
}
