'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClassrooms } from '@/hooks/useClassroom';
import {
  isTeacherUsagePromptDismissed,
  persistTeacherUsagePromptDismissed,
  teacherUsagePrompt,
  TEACHER_USAGE_PROMPT_MIN_STUDENTS,
  type TeacherUsagePromptReason,
} from '@/lib/education/teacherUsagePrompt';
import { countClassroomCreatedAssignments } from '@/lib/education/teacherProMilestoneCounts';

export interface TeacherUsagePromptState {
  /** Which limit was hit, or null when no classroom has earned the ask. */
  reason: TeacherUsagePromptReason | null;
  /** The count behind `reason` (roster size or created-assignment count). */
  count: number;
  loading: boolean;
  dismissed: boolean;
  dismiss: () => void;
}

/**
 * Whether the signed-in teacher has hit a usage limit Teacher Pro lifts.
 *
 * Roster (>=10 students in one class) is already on `useClassrooms` — that
 * path never waits on assignments. Created-assignment counts are fetched only
 * when the roster alone is not enough, mirroring useTeacherProMilestone.
 * Unknown reads fail closed (no ask) so a late answer cannot retract an
 * upsell (pitfall class 1).
 *
 * Dismiss is local: Polar is unchanged, and a teacher who said "not now"
 * keeps the persistent Pro entry in the header to find upgrade later.
 */
export function useTeacherUsagePrompt(): TeacherUsagePromptState {
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();
  const [dismissed, setDismissed] = useState(true);
  const [createdById, setCreatedById] = useState<Record<string, number>>({});
  const [createdLoading, setCreatedLoading] = useState(false);

  useEffect(() => {
    setDismissed(isTeacherUsagePromptDismissed(window.localStorage));
  }, []);

  const dismiss = useCallback(() => {
    persistTeacherUsagePromptDismissed(window.localStorage);
    setDismissed(true);
  }, []);

  const rosterHit = useMemo(
    () =>
      classrooms.some(
        (c) => (c.member_count ?? 0) >= TEACHER_USAGE_PROMPT_MIN_STUDENTS,
      ),
    [classrooms],
  );

  const classroomKey = classrooms.map((c) => c.id).join(',');

  useEffect(() => {
    if (classroomsLoading || rosterHit || classrooms.length === 0) {
      setCreatedLoading(false);
      return;
    }
    let cancelled = false;
    setCreatedLoading(true);
    void Promise.all(
      classrooms.map(async (c) => {
        const count = await countClassroomCreatedAssignments(c.id);
        return [c.id, count] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setCreatedById(Object.fromEntries(rows));
      setCreatedLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [classrooms, classroomsLoading, rosterHit, classroomKey]);

  const snapshots = useMemo(
    () =>
      classrooms.map((c) => ({
        studentCount: c.member_count ?? 0,
        assignmentCreatedCount: createdById[c.id],
      })),
    [classrooms, createdById],
  );

  const prompt = teacherUsagePrompt(snapshots);
  const loading = classroomsLoading || (!rosterHit && classrooms.length > 0 && createdLoading);

  return {
    reason: prompt?.reason ?? null,
    count: prompt?.count ?? 0,
    loading,
    dismissed,
    dismiss,
  };
}
