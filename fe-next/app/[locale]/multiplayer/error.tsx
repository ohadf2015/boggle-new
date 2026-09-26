'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { Mascot } from '@/components/ui/Mascot';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import { mpExit } from '@/lib/multiplayer/exitDestination';
import { stripMultiplayerExitParams } from '@/lib/multiplayer/stripExitParams';

export default function MultiplayerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const router = useRouter();
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
              // `mpExit('error')`: a classroom game (?classroom=true[&host=true])
              // goes to the teacher/student hub; everyone else goes back to the
              // MP entry — never the LexiClash homepage.
              const search = typeof window !== 'undefined' ? window.location.search : '';
              const query = new URLSearchParams(search);
              const action = mpExit('error', {
                isClassroomMode: query.get('classroom') === 'true',
                isHost: query.get('host') === 'true',
                locale,
              });
              let target = `/${locale}/multiplayer`;
              if (action.kind === 'navigate') {
                target = action.href;
              } else if (typeof window !== 'undefined') {
                // Drop room/classroom/host so the entry does not re-enter the
                // room that just crashed (the 2026-05-04 reload trap).
                const stripped = new URL(stripMultiplayerExitParams(window.location.href));
                target = `${stripped.pathname}${stripped.search}`;
                // Same guard as every in-room exit: no auto-rejoin on the remount.
                try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* blocked */ }
              }
              // A stale chunk after a deploy only recovers with a real load;
              // everything else stays an SPA nav (a hard nav blanks the
              // Capacitor static-export WebView).
              if (error.name === 'ChunkLoadError' && typeof window !== 'undefined') {
                window.location.assign(target);
                return;
              }
              router.push(target);
              if (action.kind !== 'navigate') reset();
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
