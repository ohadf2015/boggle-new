/**
 * useClassPulse — the last game for one class, folded into its state.
 *
 * Thin by design: `useRecentClassroomGames` already owns the fetch and its
 * loading/error states, and `deriveClassPulse` owns every judgement. This
 * hook exists only to join them, and to keep "the read failed" from arriving
 * at the card looking exactly like "there is no history" — the two are the
 * same `games: []` on the way in and must not be the same sentence on the
 * way out.
 *
 * Reads ONE game. The pulse is a statement about the last lesson, not a
 * trend; the multi-game trend view is what Teacher Pro sells, and a free
 * teacher has to be able to see this.
 */

'use client';

import { useMemo } from 'react';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { deriveClassPulse, type ClassPulse } from '@/lib/education/classPulse';

export interface UseClassPulseOptions {
  classroomId: string;
  /** Live enrolment, from `classrooms[].member_count` — not a game's roster. */
  rosterCount: number;
  /** Injectable clock, so "3 days ago" is testable without faking timers. */
  now?: number;
}

export interface UseClassPulseReturn {
  pulse: ClassPulse;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useClassPulse({ classroomId, rosterCount, now }: UseClassPulseOptions): UseClassPulseReturn {
  const { games, isLoading, error, refresh } = useRecentClassroomGames({ classroomId, limit: 1 });

  const pulse = useMemo(
    () =>
      deriveClassPulse({
        rosterCount,
        // While the read is open we hold the pessimistic shape rather than an
        // optimistic guess a later frame would overwrite (pitfall class 1).
        lastGame: isLoading ? null : (games[0] ?? null),
        lastGameUnavailable: !!error,
        now,
      }),
    [rosterCount, isLoading, games, error, now]
  );

  return { pulse, isLoading, error: error ?? null, refresh };
}

export default useClassPulse;
