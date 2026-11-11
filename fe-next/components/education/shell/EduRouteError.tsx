'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import { readClassroomLiveFlags } from '@/lib/education/classroomLivePath';
import { multiplayerExitDestination } from '@/lib/multiplayer/exitDestination';
import { EduMascot } from '@/components/education/EduMascot';
import { claimChunkRecoveryGuard, clearCachesAndReload, isChunkLoadError } from '@/lib/deploy/staleDeployReload';

export type EduErrorArea = 'live' | 'student' | 'teacher' | 'join';

const BACK_LABEL: Record<EduErrorArea, [string, string]> = {
  live: ['eduShell.error.backToClass', 'Back to class'],
  student: ['eduShell.error.backToClass', 'Back to class'],
  teacher: ['eduShell.error.backToClasses', 'Back to your classes'],
  join: ['eduShell.error.enterCode', 'Enter a class code'],
};

/** The class hub this viewer came from: the teacher's for a live host, the student's for everyone else. */
export function eduErrorExit(area: EduErrorArea, locale: string, pathname: string, search: string): string {
  if (area === 'teacher') return `/${locale}/teacher`;
  if (area === 'join') return `/${locale}/join`;
  if (area === 'live') {
    const flags = readClassroomLiveFlags(pathname, new URLSearchParams(search));
    const hub = multiplayerExitDestination({
      isClassroomMode: flags.isClassroomMode,
      isHost: flags.isClassroomHost,
      locale,
      pathname,
    });
    if (hub) return hub;
  }
  return `/${locale}/student`;
}

const PRESS =
  'transition-[translate,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy-light';

/**
 * Crash screen for classroom routes (live room, student hub). Context-free: a
 * boundary that needs a provider can throw while rendering the error, so copy
 * comes from the cached bundle with an English fallback — never a key path.
 */
export function EduRouteError({
  error,
  reset,
  boundary,
  area,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  boundary: string;
  area: EduErrorArea;
}) {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  const t = (path: string, fallback: string): string => {
    try {
      let node: unknown = getCachedTranslation(locale as Language) || getCachedTranslation('en');
      for (const key of path.split('.')) {
        node = (node as Record<string, unknown> | undefined)?.[key];
      }
      return typeof node === 'string' && node ? node : fallback;
    } catch {
      return fallback;
    }
  };

  // A stale chunk after a deploy recovers only with a fresh, cache-busted load.
  const staleChunk = isChunkLoadError(error.name, error.message);

  useEffect(() => {
    captureError(error, { errorBoundary: { type: boundary, digest: error.digest } });
    if (staleChunk && claimChunkRecoveryGuard()) void clearCachesAndReload();
  }, [error, boundary, staleChunk]);

  const retry = () => {
    if (staleChunk) void clearCachesAndReload();
    else reset();
  };

  const backToClass = () => {
    const target = eduErrorExit(area, locale, window.location.pathname, window.location.search);
    // Pushing the URL the crash is already on would do nothing.
    if (staleChunk || target === window.location.pathname) window.location.assign(target);
    else router.push(target);
  };

  return (
    <div
      data-testid="edu-route-error"
      role="alert"
      className="flex h-dvh w-full flex-1 items-center justify-center overflow-y-auto bg-neo-navy px-4 py-8"
    >
      <div className="w-full max-w-sm rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-6 text-center shadow-hard-lg">
        <EduMascot moment="error" size={112} className="mx-auto mb-3 size-28" />
        <h1 className="mb-2 font-neo-display text-2xl font-black text-neo-cream">
          {staleChunk ? t('errors.updateHeading', 'Update ready') : t('eduShell.error.title', 'This screen hit a snag')}
        </h1>
        <p className="mb-6 font-neo-body text-base font-semibold text-neo-cream/85">
          {staleChunk
            ? t('errors.updateMessage', 'New version available. Refresh to update.')
            : t('eduShell.error.body', 'Try again. If it keeps happening, head back to your class and start from there.')}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-testid="edu-route-error-retry"
            onClick={retry}
            className={`flex min-h-[56px] w-full items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 font-neo-display text-lg font-black text-neo-black shadow-hard ${PRESS}`}
          >
            {staleChunk ? t('errors.refreshPage', 'Refresh') : t('common.retry', 'Try again')}
          </button>
          <button
            type="button"
            data-testid="edu-route-error-back"
            onClick={backToClass}
            className={`flex min-h-[48px] w-full items-center justify-center rounded-neo border-[3px] border-neo-cream bg-neo-navy px-4 font-neo-display text-base font-bold text-neo-cream ${PRESS}`}
          >
            {t(...BACK_LABEL[area])}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EduRouteError;
