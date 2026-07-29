'use client';

import { useEffect, useState } from 'react';
import { getCompletedPracticeModes } from '@/lib/practice/practiceProgress';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

/**
 * Subscribes to localStorage practice-progress writes via the custom
 * `practice:progress` event. Components re-read on every fire — small set,
 * no perf concern.
 */
export function usePracticeProgress(locale: string): Set<PracticeMode> {
  const [done, setDone] = useState<Set<PracticeMode>>(() => new Set());

  useEffect(() => {
    setDone(getCompletedPracticeModes(locale));
    const handler = () => setDone(getCompletedPracticeModes(locale));
    window.addEventListener('practice:progress', handler);
    // Cross-tab updates fire `storage` not the custom event.
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('practice:progress', handler);
      window.removeEventListener('storage', handler);
    };
  }, [locale]);

  return done;
}
