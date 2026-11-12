'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { readClassroomLiveFlags } from '@/lib/education/classroomLivePath';
import { multiplayerExitDestination } from '@/lib/multiplayer/exitDestination';
import { EduMascot } from '@/components/education/EduMascot';
import { useStaleDeployRecovery } from '@/lib/deploy/useStaleDeployRecovery';
import {
  ERROR_CARD_PRIMARY_BUTTON,
  ERROR_CARD_SECONDARY_BUTTON,
  ErrorCardShell,
  StaleDeployScreen,
  readCachedCopy,
} from '@/components/deploy/StaleDeployScreen';

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
  autoReload = area !== 'live',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  boundary: string;
  area: EduErrorArea;
  /** False where a reload would drop a running socket game, so the player chooses when to refresh. */
  autoReload?: boolean;
}) {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const t = (path: string, fallback: string): string => readCachedCopy(locale, path, fallback);

  useEffect(() => {
    captureError(error, { errorBoundary: { type: boundary, digest: error.digest } });
  }, [error, boundary]);

  const { state, refresh } = useStaleDeployRecovery(error, { autoReload });
  const staleChunk = state !== 'not-stale';

  const backToClass = () => {
    const target = eduErrorExit(area, locale, window.location.pathname, window.location.search);
    // Pushing the URL the crash is already on would do nothing.
    if (staleChunk || target === window.location.pathname) window.location.assign(target);
    else router.push(target);
  };

  const mascot = <EduMascot moment="error" size={112} className="mx-auto mb-3 size-28" />;
  const backLabel = t(...BACK_LABEL[area]);

  if (staleChunk) {
    return (
      <StaleDeployScreen
        locale={locale}
        onRefresh={refresh}
        mascot={mascot}
        testId="edu-route-error"
        refreshTestId="edu-route-error-retry"
        secondary={{ label: backLabel, onClick: backToClass, testId: 'edu-route-error-back' }}
      />
    );
  }

  return (
    <ErrorCardShell
      testId="edu-route-error"
      mascot={mascot}
      heading={t('eduShell.error.title', 'This screen hit a snag')}
      body={t('eduShell.error.body', 'Try again. If it keeps happening, head back to your class and start from there.')}
    >
      <button type="button" data-testid="edu-route-error-retry" onClick={reset} className={ERROR_CARD_PRIMARY_BUTTON}>
        {t('common.retry', 'Try again')}
      </button>
      <button type="button" data-testid="edu-route-error-back" onClick={backToClass} className={ERROR_CARD_SECONDARY_BUTTON}>
        {backLabel}
      </button>
    </ErrorCardShell>
  );
}

export default EduRouteError;
