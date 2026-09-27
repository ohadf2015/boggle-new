/**
 * "Run the same thing again" — restored BEFORE the lobby paints.
 *
 * The dashboard's repeat-last hero hands the lobby a flow flag, and the setup
 * it restores (classroom, lessons, timer, board) lands in an effect. The
 * picker's default mode is DERIVED from whether a lesson is attached, so a
 * lobby painted before the restore resolves leads with Classic and then jumps
 * to the quiz a frame later — two sources for one value, one resolving late,
 * which is recurring pitfall class 1 exactly.
 *
 * So this hook reports `pending` and the lobby holds its loader until the
 * answer is final. `pending` ALWAYS resolves: no saved setup, no classrooms, or
 * a flow that was never a repeat all settle it immediately rather than leaving
 * a teacher on a spinner (pitfall class 4).
 */

'use client';

import { useEffect, useState } from 'react';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import type { VocabularyLesson, Classroom } from '@/lib/supabase/education';

export const REPEAT_LAST_FLOW = 'repeatLast';

export interface UseRepeatLastSetupOptions {
  /** The URL flow flag, verbatim. */
  flow?: string;
  isLoading: boolean;
  classrooms: Classroom[];
  lessons: VocabularyLesson[];
  setSelectedClassroomId: (id: string) => void;
  setSelectedLessonIds: (ids: string[]) => void;
  setTimerMinutes: (minutes: number) => void;
  setBoardSize: (size: 'small' | 'medium' | 'large') => void;
}

export function useRepeatLastSetup({
  flow,
  isLoading,
  classrooms,
  lessons,
  setSelectedClassroomId,
  setSelectedLessonIds,
  setTimerMinutes,
  setBoardSize,
}: UseRepeatLastSetupOptions): { pending: boolean } {
  const { getMostRecent } = useRecentGameSettings();
  const wanted = flow === REPEAT_LAST_FLOW;
  const [applied, setApplied] = useState(!wanted);

  useEffect(() => {
    if (applied || isLoading) return;

    // Nothing to restore into — the empty state owns the screen from here.
    if (classrooms.length === 0) {
      setApplied(true);
      return;
    }

    const last = getMostRecent();
    if (last) {
      if (last.classroomId && classrooms.some((c) => c.id === last.classroomId)) {
        setSelectedClassroomId(last.classroomId);
      }
      const validLessonIds = last.lessonIds.filter((id) => lessons.some((l) => l.id === id));
      if (validLessonIds.length > 0) setSelectedLessonIds(validLessonIds);
      if (last.settings?.timerMinutes) setTimerMinutes(last.settings.timerMinutes);
      if (last.settings?.boardSize) setBoardSize(last.settings.boardSize);
    }
    setApplied(true);
  }, [
    applied,
    isLoading,
    classrooms,
    lessons,
    getMostRecent,
    setSelectedClassroomId,
    setSelectedLessonIds,
    setTimerMinutes,
    setBoardSize,
  ]);

  return { pending: !applied };
}
