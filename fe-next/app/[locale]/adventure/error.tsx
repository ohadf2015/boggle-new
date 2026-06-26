'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { Mascot } from '@/components/ui/Mascot';
import { translations } from '../../../translations';

export default function AdventureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

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
    // Use error.message (string) not the Error object — Sentry's console
    // integration serializes Error objects to `{}`, producing "Adventure error: {}"
    // in the issue title. captureError below carries the full stack.
    console.error('Adventure error:', error.message);
    captureError(error, {
      errorBoundary: { type: 'adventure-error', digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy px-4 py-8">
      <div className="max-w-lg w-full text-center">
        <Mascot variant="scared" size="xs" animated={false} className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          {t('errors.errorHeading')}
        </h2>
        <p className="text-gray-300 mb-6">
          {t('errors.errorMessage')}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2 rounded-lg font-bold bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all"
          >
            {t('common.retry')}
          </button>
          <button
            type="button"
            onClick={() => window.location.href = `/${locale}`}
            className="px-5 py-2 rounded-lg font-bold bg-neo-navy-light text-white border border-gray-600 hover:bg-neo-navy-elevated transition-all"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
