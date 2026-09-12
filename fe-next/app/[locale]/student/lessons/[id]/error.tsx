'use client';

/**
 * The recovery screen for a practice session that fell over mid-flow.
 *
 * A lesson link is the one URL a teacher hands out on paper, reads aloud, or
 * pins in a class chat — and the r2 capture watched this route dead-end on a
 * student twice in one session. Whatever the cause (a stale chunk after a
 * deploy, a render that threw, a lesson that answered with nothing), what a
 * twelve year old sees must not be a stack trace or a bare 404: it is one
 * mascot, one sentence, and one big button that tries again.
 *
 * Deliberately context-free. An error boundary that itself depends on a
 * provider can throw while rendering the error, which loops — so translations
 * come from the cached bundle by path, exactly as the multiplayer boundary
 * does, and the only state it touches is the locale in the URL.
 */

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { captureError } from '@/utils/sentry';
import { Mascot } from '@/components/ui/Mascot';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';

export default function LessonPracticeError({
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
      return typeof current === 'string' ? current : path;
    } catch {
      return path;
    }
  };

  useEffect(() => {
    captureError(error, {
      errorBoundary: { type: 'student-lesson-practice', digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-neo-navy px-4 py-8">
      <div className="w-full max-w-sm rounded-neo border-[3px] border-black bg-neo-navy-light p-5 text-center shadow-hard-lg">
        <Mascot variant="oops" size="sm" animated={false} className="mx-auto mb-3" />
        <h1 className="mb-2 font-neo-display text-xl font-black uppercase text-neo-white">
          {t('education.practice.lessonUnavailable')}
        </h1>
        <p className="mb-5 font-neo-body text-sm font-bold text-neo-cream">
          {t('education.practice.lessonUnavailableBody')}
        </p>
        <button
          type="button"
          data-primary="true"
          data-testid="practice-error-retry"
          onClick={reset}
          className="flex min-h-[56px] w-full items-center justify-center rounded-neo border-[3px] border-black bg-neo-lime px-4 font-neo-display text-lg font-black uppercase text-black shadow-hard active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('student.practiceFun.tryAgain')}
        </button>
        <button
          type="button"
          data-testid="practice-error-exit"
          onClick={() => {
            window.location.href = `/${locale}/student`;
          }}
          className="mx-auto mt-2 block min-h-[40px] w-3/5 rounded-neo border-[2px] border-neo-cream bg-neo-navy px-4 font-neo-body text-xs font-bold uppercase text-neo-cream"
        >
          {t('student.practiceFun.myLessons')}
        </button>
      </div>
    </div>
  );
}
