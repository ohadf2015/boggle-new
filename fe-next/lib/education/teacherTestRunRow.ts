import { gradePercentFromProgress, type ProgressRowLike } from './googleClassroomGrades';
import type { RosterProgressRow } from './classroomRosterProgress';

interface OwnProgress extends ProgressRowLike {
  lesson_id: string;
  total_practice_sessions?: number | null;
  last_practice_date?: string | null;
}

/** The teacher's own student-mode play on this class's lessons, as a roster row; null when they haven't played any. */
export function buildTeacherTestRunRow(args: {
  teacherId: string;
  name: string;
  assignments: ReadonlyArray<{ id: string; lessonId: string }>;
  progress: ReadonlyArray<OwnProgress>;
}): RosterProgressRow | null {
  const byLesson = new Map(args.progress.map((p) => [p.lesson_id, p]));
  const played = args.assignments.flatMap((a) => {
    const own = byLesson.get(a.lessonId);
    return own && (own.completed_at || (own.total_practice_sessions ?? 0) > 0) ? [own] : [];
  });
  if (played.length === 0) return null;

  const scores = played.map(gradePercentFromProgress).filter((s): s is number => s != null);
  const days = played.map((p) => p.last_practice_date ?? p.completed_at?.slice(0, 10) ?? '').filter(Boolean).sort();
  return {
    studentId: args.teacherId,
    name: args.name,
    completedAssignments: played.length,
    totalAssignments: args.assignments.length,
    averageScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
    lastActiveAt: days[days.length - 1] ?? null,
    joinFunnelStatus: 'signed_in',
  };
}
