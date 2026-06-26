'use client';

import { useEffect } from 'react';
import { captureError } from '@/utils/sentry';
import { Mascot } from '@/components/ui/Mascot';
import { translations } from '../../../translations';

type SupportedLocale = keyof typeof translations;

function getLocale(): SupportedLocale {
  try {
    const match = window.location.pathname.match(/^\/(he|en|sv|ja|es)\b/);
    return (match?.[1] as SupportedLocale) || 'en';
  } catch {
    return 'en';
  }
}

function t(locale: SupportedLocale, path: string): string {
  try {
    const keys = path.split('.');
    let current: unknown = translations[locale] || translations.en;
    for (const key of keys) {
      current = (current as Record<string, unknown>)[key];
      if (current === undefined) return path;
    }
    return current as string;
  } catch {
    return path;
  }
}

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Profile error:', error);
    captureError(error, { errorBoundary: { type: 'profile-error', digest: error.digest } });
  }, [error]);

  const locale = getLocale();

  return (
    <div className="flex-1 bg-neo-navy">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Mascot variant="sad" size="xs" animated={false} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {t(locale, 'errors.failedToLoadProfile')}
          </h2>
          <p className="text-gray-600 mb-6">
            {error.message || t(locale, 'errors.unableToLoadData')}
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2 rounded-lg font-bold bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all inline-flex items-center gap-2"
          >
            🔄 {t(locale, 'errors.tryAgainButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
