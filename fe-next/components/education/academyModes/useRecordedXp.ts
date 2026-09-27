'use client';

/**
 * Records a finished academy round and resolves to the SERVER's XP, or null
 * when it was not saved.
 *
 * `completePracticeSession` still runs (streak, achievements, level-up — all
 * client-side) but WITHOUT the session id, so the provider skips its own PATCH:
 * that one swallows failures and leaves a client estimate on screen. This hook
 * sends the same PATCH /api/education/practice itself and reads the session row
 * it returns (lib/education/practiceCompletionRecord).
 */

import { useCallback } from 'react';
import { usePracticeSession, type CompletePracticeSessionData } from '@/components/education/PracticeSessionProvider';
import { completionPatchBody, recordedXpFrom } from '@/lib/education/practiceCompletionRecord';

export function useRecordedXp(): (data: CompletePracticeSessionData) => Promise<number | null> {
  const { completePracticeSession } = usePracticeSession();
  return useCallback(
    async (data: CompletePracticeSessionData) => {
      const { sessionId, ...clientSide } = data;
      await completePracticeSession(clientSide).catch(() => undefined);
      if (!sessionId) return null;
      try {
        const res = await fetch('/api/education/practice', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completionPatchBody({ ...data, sessionId })),
        });
        return recordedXpFrom(res.ok, res.ok ? await res.json() : null);
      } catch {
        return null;
      }
    },
    [completePracticeSession],
  );
}
