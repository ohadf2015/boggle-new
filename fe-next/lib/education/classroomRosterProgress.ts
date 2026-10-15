/**
 * Pure model for the free classroom roster progress report on the teacher
 * class view (components/teacher/reports/ClassroomRosterProgress.tsx).
 *
 * One row per roster student: assignment completion counts, average score
 * across completed assignments, last-active date, and a join-funnel status a
 * free teacher can act on. The #1310 student-join
 * events (student_join_completed / student_join_failed) made the join step
 * countable; the drop-off AFTER the join — invite converted, never practiced —
 * is only visible teacher-side if the roster surfaces it, which is what
 * `joined_idle` is for.
 *
 * Status precedence is the spec's listed order, a pure waterfall:
 *   1. `signed_in`    — profile carries a real display_name or username (NOT
 *                       the DB placeholder /^Player_[0-9a-f]{8}$/i). Profile is
 *                       the identity signal; practice does not demote it.
 *   2. `guest`        — guest-like (no profile OR placeholder username) AND
 *                       has practiced (lastPracticeDate set).
 *   3. `joined_idle`  — on the roster (joinedAt set) but never practiced.
 * A guest-like row with neither joinedAt nor practice data can only be a
 * malformed membership; it falls back to `guest` rather than pretending the
 * join step succeeded.
 *
 * Nothing here fetches or translates — the caller resolves display names and
 * passes raw ISO strings. No supabase, no React.
 */

import type { AssignmentProgressRow } from './assignmentProgressReport';

/** DB default from the handle_new_user trigger: 'Player_' || substr(id, 1, 8). */
export const PLAYER_PLACEHOLDER_RE = /^Player_[0-9a-f]{8}$/i;

export type RosterJoinFunnelStatus = 'signed_in' | 'guest' | 'joined_idle';

export interface RosterStudentInput {
  studentId: string;
  /** Roster display name — the caller already ran it through resolveDisplayName. */
  name: string;
  /** classroom_memberships.joined_at (ISO). Null only for malformed rows. */
  joinedAt: string | null;
  /** public_profiles.display_name — null when the profile read came back empty. */
  displayName?: string | null;
  /** public_profiles.username — the DB default is the Player_xxxxxxxx placeholder. */
  username?: string | null;
}

/** Per-student assignment totals, usually derived via countRosterAssignmentProgress. */
export interface RosterAssignmentCounts {
  studentId: string;
  assignmentCount: number;
  completedCount: number;
  /** Mean of completed assignment scores (0–100). Null when nothing is scored. */
  averageScore: number | null;
}

export interface RosterLastPractice {
  studentId: string;
  lastPracticeDate: string | null;
}

export interface RosterProgressRow {
  studentId: string;
  name: string;
  completedAssignments: number;
  totalAssignments: number;
  /** Mean of completed assignment scores (0–100). Null when nothing is scored. */
  averageScore: number | null;
  /** lastPracticeDate ?? joinedAt ?? null — what "stale first" sorts on. */
  lastActiveAt: string | null;
  joinFunnelStatus: RosterJoinFunnelStatus;
}

export interface ParentShareLine {
  name: string;
  completion: string;
  averageScore: string;
  lastActive: string;
}

/**
 * Tab-separated parent handout. Join-funnel status stays off this surface —
 * that is teacher ops, not something to send home.
 */
export function buildParentShareSummary(args: {
  heading: string;
  classroomName: string;
  generatedAt: string;
  columns: {
    student: string;
    completion: string;
    averageScore: string;
    lastActive: string;
  };
  lines: ParentShareLine[];
}): string {
  const { heading, classroomName, generatedAt, columns, lines } = args;
  const header = [columns.student, columns.completion, columns.averageScore, columns.lastActive].join('\t');
  const body = lines
    .map((line) => [line.name, line.completion, line.averageScore, line.lastActive].join('\t'))
    .join('\n');
  return [heading, classroomName, generatedAt, '', header, body].join('\n');
}

/**
 * True when the profile carries a teacher-legible name rather than the DB
 * placeholder. Either field being real is enough — display_name is written by
 * the signup trigger, username falls back to Player_<id> when nothing was
 * chosen, and guests who typed a name have a real display_name.
 */
export function hasRealProfileName(profile: {
  displayName?: string | null;
  username?: string | null;
}): boolean {
  return [profile.displayName, profile.username].some(
    (candidate) =>
      typeof candidate === 'string' &&
      candidate.trim() !== '' &&
      !PLAYER_PLACEHOLDER_RE.test(candidate.trim()),
  );
}

export function resolveJoinFunnelStatus(
  student: RosterStudentInput,
  lastPracticeDate: string | null,
): RosterJoinFunnelStatus {
  if (hasRealProfileName(student)) return 'signed_in';
  if (lastPracticeDate != null) return 'guest';
  if (student.joinedAt != null) return 'joined_idle';
  return 'guest';
}

/** joined_idle is the actionable cohort, so it leads; signed_in is the settled tail. */
const STATUS_ORDER: Record<RosterJoinFunnelStatus, number> = {
  joined_idle: 0,
  guest: 1,
  signed_in: 2,
};

export function buildClassroomRosterProgress(args: {
  students: RosterStudentInput[];
  assignmentCounts?: RosterAssignmentCounts[];
  lastPractice?: RosterLastPractice[];
}): RosterProgressRow[] {
  const { students, assignmentCounts = [], lastPractice = [] } = args;
  const countsByStudent = new Map(assignmentCounts.map((c) => [c.studentId, c]));
  const practiceByStudent = new Map(lastPractice.map((p) => [p.studentId, p.lastPracticeDate]));

  const rows = students.map((student) => {
    const counts = countsByStudent.get(student.studentId);
    const practicedAt = practiceByStudent.get(student.studentId) ?? null;
    return {
      studentId: student.studentId,
      name: student.name,
      completedAssignments: counts?.completedCount ?? 0,
      totalAssignments: counts?.assignmentCount ?? 0,
      averageScore: counts?.averageScore ?? null,
      lastActiveAt: practicedAt ?? student.joinedAt ?? null,
      joinFunnelStatus: resolveJoinFunnelStatus(student, practicedAt),
    };
  });

  rows.sort((a, b) => {
    const byStatus = STATUS_ORDER[a.joinFunnelStatus] - STATUS_ORDER[b.joinFunnelStatus];
    if (byStatus !== 0) return byStatus;
    // Stale first; a row with no dates at all sinks below its group.
    if (a.lastActiveAt == null) return b.lastActiveAt == null ? a.name.localeCompare(b.name) : 1;
    if (b.lastActiveAt == null) return -1;
    if (a.lastActiveAt !== b.lastActiveAt) return a.lastActiveAt < b.lastActiveAt ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return rows;
}

/**
 * Reduce the per-(student × assignment) rows from buildAssignmentProgressRows
 * into the per-student counts the roster model takes — completed vs the
 * assignment total, missing/overdue included in the denominator.
 */
export function countRosterAssignmentProgress(
  rows: AssignmentProgressRow[],
): RosterAssignmentCounts[] {
  const byStudent = new Map<
    string,
    { studentId: string; assignmentCount: number; completedCount: number; scoreSum: number; scoredCount: number }
  >();
  for (const row of rows) {
    let entry = byStudent.get(row.studentId);
    if (!entry) {
      entry = { studentId: row.studentId, assignmentCount: 0, completedCount: 0, scoreSum: 0, scoredCount: 0 };
      byStudent.set(row.studentId, entry);
    }
    entry.assignmentCount += 1;
    if (row.status === 'completed') {
      entry.completedCount += 1;
      if (typeof row.score === 'number' && Number.isFinite(row.score)) {
        entry.scoreSum += row.score;
        entry.scoredCount += 1;
      }
    }
  }
  return [...byStudent.values()].map(({ scoreSum, scoredCount, ...rest }) => ({
    ...rest,
    averageScore: scoredCount > 0 ? Math.round(scoreSum / scoredCount) : null,
  }));
}
