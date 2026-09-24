'use client';

/**
 * Error boundary body for the academy mode routes. Context-free on purpose
 * (a boundary that needs a provider can throw while rendering the error), so
 * translations come from the cached bundle by path. The only exit is
 * /{locale}/student — never the homepage.
 */

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';

export default function AcademyModeError({ error, reset, boundary }: { error: Error & { digest?: string }; reset: () => void; boundary: string }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const t = (path: string, fallback: string): string => {
    try {
      let current: unknown = getCachedTranslation(locale as Language) || getCachedTranslation('en');
      for (const key of path.split('.')) {
        current = (current as Record<string, unknown>)?.[key];
        if (current === undefined) return fallback;
      }
      return typeof current === 'string' ? current : fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    captureError(error, { errorBoundary: { type: boundary, digest: error.digest } });
  }, [error, boundary]);

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-neo-navy px-4 py-8">
      <div className="w-full max-w-sm rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-5 text-center shadow-hard-lg">
        <h1 className="mb-4 font-neo-display text-xl font-black uppercase text-neo-white">
          {t('academy.modes.errorTitle', 'Oops, that broke. Try again?')}
        </h1>
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[56px] w-full items-center justify-center rounded-neo border-[3px] border-black bg-neo-lime px-4 font-neo-display text-lg font-black uppercase text-black shadow-hard"
        >
          {t('academy.modes.tryAgain', 'Try again')}
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = `/${locale}/student`;
          }}
          className="mx-auto mt-2 block min-h-[40px] w-3/5 rounded-neo border-[2px] border-neo-cream bg-neo-navy px-4 font-neo-body text-xs font-bold uppercase text-neo-cream"
        >
          {t('academy.modes.backToAcademy', 'Back to Academy')}
        </button>
      </div>
    </div>
  );
}
