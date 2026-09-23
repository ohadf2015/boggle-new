'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { Mascot } from '@/components/ui/Mascot';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import { sectionHome } from '@/lib/navigation/sectionHome';

export default function MultiplayerError({
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
    console.error('Multiplayer error:', error);
    captureError(error, {
      errorBoundary: { type: 'multiplayer-error', digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy px-4 py-8">
      <div className="max-w-lg w-full text-center">
        <Mascot variant="panic" size="xs" animated={false} className="mx-auto mb-4" />
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
            onClick={() => {
              // A classroom game (?classroom=true[&host=true]) must send the
              // teacher/student back to their own hub, not the consumer
              // arcade lobby or the main app home — see sectionHome's
              // `search` handling and lib/multiplayer/exitDestination.ts.
              const home = sectionHome({
                pathname: typeof window !== 'undefined' ? window.location.pathname : `/${locale}`,
                locale,
                search: typeof window !== 'undefined' ? window.location.search : undefined,
              });
              window.location.href = home;
            }}
            className="px-5 py-2 rounded-lg font-bold bg-neo-navy-light text-white border border-gray-600 hover:bg-neo-navy-elevated transition-all"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
