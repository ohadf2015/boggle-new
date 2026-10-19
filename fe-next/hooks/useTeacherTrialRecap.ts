'use client';

import { useMemo } from 'react';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherWeekStats } from '@/hooks/useTeacherWeekStats';
import type { TrialRecap } from '@/components/education/TrialRecapLine';

/** Null until the 30-day read lands or when it fails, so the banner never shows a false zero. */
export function useTeacherTrialRecap(): TrialRecap | null {
  const { classrooms, isLoading } = useClassrooms();
  const { summary } = useTeacherWeekStats(classrooms, !isLoading);
  return useMemo(
    () => (summary ? { games: summary.gamesLast30d, students: summary.totalStudents } : null),
    [summary],
  );
}
