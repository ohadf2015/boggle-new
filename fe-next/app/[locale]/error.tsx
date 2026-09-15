'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import {
  clearCachesAndReload,
  isChunkLoadError as isChunkLoadErrorNameMessage,
  claimChunkRecoveryGuard,
  clearChunkRecoveryGuard,
} from '@/lib/deploy/staleDeployReload';

function isChunkLoadError(error: Error): boolean {
  return isChunkLoadErrorNameMessage(error.name, error.message);
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
      let current: unknown = getCachedTranslation(locale as Language) || getCachedTranslation('en');
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
      if (claimChunkRecoveryGuard()) {
        void clearCachesAndReload();
        return;
      }
      // Already tried refreshing once - clear the flag for next time
      clearChunkRecoveryGuard();
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
            type="button"
            onClick={handleRefresh}
            className="btn-neo-primary px-6 py-3 text-lg"
          >
            {isChunkError ? `✨ ${t('errors.refreshPage')}` : `🔄 ${t('common.retry')}`}
          </button>
          <button
            type="button"
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
