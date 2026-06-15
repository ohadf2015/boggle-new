'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { translations } from '../../translations';

function isChunkLoadError(error: Error): boolean {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Check for explicit chunk load error name
  if (name === 'chunkloaderror') return true;

  // Check for "module is not defined" - CommonJS/ESM bundling issue
  // This happens when Turbopack fails to transpile a CommonJS module for browser
  // Fixes JAVASCRIPT-NEXTJS-9S: ReferenceError: module is not defined
  if (name === 'referenceerror' && message.includes('module is not defined')) {
    return true;
  }

  // Check for specific chunk-related error messages
  // Note: 'failed to fetch' alone is too broad - only match if it's clearly a chunk/module error
  return (
    message.includes('loading chunk') ||
    message.includes('failed to load chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module') ||
    message.includes('_next/static/chunks') ||
    message.includes('module 964893') || // Specific error from report
    // Only match 'failed to fetch' if it's in context of module/chunk loading
    (message.includes('failed to fetch') && (
      message.includes('module') ||
      message.includes('chunk') ||
      message.includes('_next/') ||
      message.includes('dynamically imported')
    ))
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
    const chunkError = isChunkLoadError(error);

    // Log BEFORE any reload — a reload mid-capture drops the Sentry event,
    // leaving us blind to whether stale-deploy chunk errors still recur.
    console.error('Page error:', error.name, error.message);
    captureError(error, {
      errorBoundary: {
        type: 'page-error',
        digest: error.digest,
        isChunkError: chunkError,
        // Tag the locale + route so cross-[locale] navigation failures (the
        // language-switch "black screen" class) are diagnosable. This effect
        // only runs because the fallback below is dependency-free and always
        // renders — a heavy fallback that crashed here would also lose telemetry.
        locale,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      },
    });

    // Auto-refresh on chunk load errors (stale deployment cache)
    if (chunkError) {
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
  }, [error, locale]);

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
    <div className="flex-1 flex items-center justify-center bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy px-4 py-8">
      <div className="neo-card max-w-lg w-full p-8 text-center animate-neo-pop rotate-[-1deg] bg-neo-cream border-4 border-neo-black shadow-hard-xl">
        {/*
          Static, dependency-free icon. This is an error boundary fallback — it
          renders precisely when chunks are broken (e.g. a stale-deploy
          ChunkLoadError surfaced by a cross-[locale] language switch). It must
          NOT pull a heavy/lazy chunk (the old animated mascot dragged in a
          motion lib, next/image, video and the mascot data module): if that
          chunk were also stale the fallback would throw, React cannot re-catch a
          throw inside a boundary's own fallback, the tree unmounts → blank navy
          "black screen". A plain emoji always renders.
        */}
        <div className="mb-6 flex justify-center" aria-hidden="true">
          <span className="text-7xl leading-none animate-neo-pop select-none">
            {isChunkError ? '✨' : '😵‍💫'}
          </span>
        </div>

        <h2 className="text-3xl font-black text-neo-black mb-3 uppercase tracking-wide font-neo-display">
          {isChunkError ? t('errors.updateHeading') : t('errors.errorHeading')}
        </h2>

        <p className="text-neo-gray text-lg mb-8 leading-relaxed">
          {isChunkError
            ? t('errors.updateMessage')
            : t('errors.errorMessage')}
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
