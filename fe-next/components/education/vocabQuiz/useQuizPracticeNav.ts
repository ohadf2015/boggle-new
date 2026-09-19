'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * "Practice" from the student's quiz finale.
 *
 * The board modes' results send a student to `/student/lessons/<id>`, but the
 * quiz's end payload carries no lesson id, so the finale had no practice exit at
 * all. The lesson list is the nearest honest target: every lesson there opens
 * its own practice.
 */
export function useQuizPracticeNav(): () => void {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'en';
  return useCallback(() => router.push(`/${locale}/student/lessons`), [router, locale]);
}
