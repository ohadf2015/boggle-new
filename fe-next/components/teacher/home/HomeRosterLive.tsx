'use client';

import { useMemo, useState } from 'react';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import { rosterRows, type RosterRow } from './rosterModel';

/** One per-student read for the selected class, shared by the desk roster and the rail card. */
export function useHomeRoster(classroomId: string, nowMs: number): { rows: RosterRow[] | null; failed: boolean } {
  const { students, isLoading, error } = useStudentProgressMetrics({ classroomId });
  // The metrics hook keeps the old class's result until its effect starts the new read, so trust it only after this class's load began.
  const [startedFor, setStartedFor] = useState<string | null>(null);
  if (isLoading && startedFor !== classroomId) setStartedFor(classroomId);
  const settled = startedFor === classroomId && !isLoading;
  const rows = useMemo(() => (settled && !error ? rosterRows(students, nowMs) : null), [settled, error, students, nowMs]);
  return { rows, failed: settled && Boolean(error) };
}
