'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClassrooms } from '@/hooks/useClassroom';
import {
  isTeacherProAskDismissed,
  persistTeacherProAskDismissed,
  teacherHitsProUpgradeMilestone,
  type ClassroomEngagementSnapshot,
} from '@/lib/education/teacherProMilestone';
import { countClassroomCompletedActivities } from '@/lib/education/teacherProMilestoneCounts';

export interface TeacherProMilestoneState {
  hasMilestone: boolean;
  loading: boolean;
  dismissed: boolean;
  dismiss: () => void;
}

/**
 * Whether the signed-in teacher has a classroom that has earned the Pro ask.
 *
 * Roster (>=3 students) is already on `useClassrooms` — that path never waits
 * on games. Games/assignments are fetched only when the roster alone is not
 * enough. Unknown reads fail closed (no ask) so a later answer cannot retract
 * an upsell (pitfall class 1).
 *
 * Dismiss is local: Polar is unchanged, and a teacher who said "not now" keeps
 * the persistent Pro entry in the header to find upgrade later.
 */
export function useTeacherProMilestone(): TeacherProMilestoneState {
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();
  const [dismissed, setDismissed] = useState(true);
  const [completedById, setCompletedById] = useState<
    Record<string, { gameCount: number; assignmentCompletedCount: number }>
  >({});
  const [completedLoading, setCompletedLoading] = useState(false);

  useEffect(() => {
    setDismissed(isTeacherProAskDismissed(window.localStorage));
  }, []);

  const dismiss = useCallback(() => {
    persistTeacherProAskDismissed(window.localStorage);
    setDismissed(true);
  }, []);

  const rosterHit = useMemo(
    () =>
      teacherHitsProUpgradeMilestone(
        classrooms.map((c) => ({ studentCount: c.member_count ?? 0 })),
      ),
    [classrooms],
  );

  const classroomKey = classrooms.map((c) => c.id).join(',');

  useEffect(() => {
    if (classroomsLoading || rosterHit || classrooms.length === 0) {
      setCompletedLoading(false);
      return;
    }
    let cancelled = false;
    setCompletedLoading(true);
    void Promise.all(
      classrooms.map(async (c) => {
        const counts = await countClassroomCompletedActivities(c.id);
        return [c.id, counts] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setCompletedById(Object.fromEntries(rows));
      setCompletedLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [classrooms, classroomsLoading, rosterHit, classroomKey]);

  const snapshots: ClassroomEngagementSnapshot[] = useMemo(
    () =>
      classrooms.map((c) => ({
        studentCount: c.member_count ?? 0,
        gameCount: completedById[c.id]?.gameCount,
        assignmentCompletedCount: completedById[c.id]?.assignmentCompletedCount,
      })),
    [classrooms, completedById],
  );

  const hasMilestone = teacherHitsProUpgradeMilestone(snapshots);
  const loading = classroomsLoading || (!rosterHit && classrooms.length > 0 && completedLoading);

  return { hasMilestone, loading, dismissed, dismiss };
}
