'use client';

import { useCallback, useEffect, useState } from 'react';
import { isTeacherWinbackDismissed, persistTeacherWinbackDismissed } from '@/lib/education/teacherWinback';

/**
 * Permanent dismiss for the never-tried recall. Starts dismissed until storage
 * is read, so a reload never flashes a banner the teacher already closed.
 */
export function useTeacherWinbackDismiss(): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isTeacherWinbackDismissed(window.localStorage));
  }, []);

  const dismiss = useCallback(() => {
    persistTeacherWinbackDismissed(window.localStorage);
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
