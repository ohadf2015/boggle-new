/**
 * One classroom for the admin drill-down: roster, assignments, live rounds and recent
 * games. Pure: the route reads the rows, this shapes them and drops test students.
 */

import type { ClassroomGameSummary } from '@/lib/education/teacherActivity';

const DAY_MS = 86_400_000;
const ROUNDS_WINDOW_DAYS = 30;

export interface ClassDetailInput {
  nowMs: number;
  classroom: {
    id: string;
    name: string | null;
    join_code: string | null;
    language: string | null;
    created_at: string | null;
    teacher_id: string | null;
  };
  profiles: Array<{
    id: string;
    display_name: string | null;
    username: string | null;
    last_seen_at: string | null;
    is_test_account: boolean | null;
  }>;
  memberships: Array<{ student_id: string; joined_at: string | null }>;
  assignments: Array<{ id: string; lesson_id: string; due_date: string | null; created_at: string | null }>;
  lessons: Array<{ id: string; name: string | null }>;
  progress: Array<{ assignment_id: string | null; student_id: string; completed_at: string | null }>;
  /** Null when classroom_rounds is not migrated in this database. */
  rounds: Array<{ game_mode: string; player_count: number; completed_at: string }> | null;
  games: ClassroomGameSummary[];
}

export interface ClassDetail {
  classroom: { id: string; name: string | null; joinCode: string | null; language: string | null; createdAt: string | null };
  teacher: { id: string; name: string | null; lastSeenAt: string | null; isTestAccount: boolean } | null;
  students: Array<{ id: string; name: string | null; joinedAt: string | null; lastSeenAt: string | null }>;
  studentCount: number;
  excludedTestStudents: number;
  assignments: Array<{
    id: string;
    lessonName: string | null;
    dueDate: string | null;
    createdAt: string | null;
    completed: number;
    assigned: number;
  }>;
  rounds: {
    available: boolean;
    last30Days: number | null;
    lastPlayedAt: string | null;
    modes: Array<{ mode: string; rounds: number }>;
  };
  games: ClassroomGameSummary[];
}

const toMs = (ts: string | null) => (ts ? Date.parse(ts) : NaN);
const msOrFloor = (ts: string | null) => {
  const ms = toMs(ts);
  return Number.isNaN(ms) ? -Infinity : ms;
};

export function buildClassDetail(input: ClassDetailInput): ClassDetail {
  const { classroom, nowMs } = input;
  const profileOf = new Map(input.profiles.map((p) => [p.id, p]));
  const nameOf = (id: string) => {
    const p = profileOf.get(id);
    return (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || null;
  };
  const isTest = (id: string) => profileOf.get(id)?.is_test_account === true;

  const roster = [...new Map(input.memberships.map((m) => [m.student_id, m])).values()];
  const real = roster.filter((m) => !isTest(m.student_id));
  const students = real
    .map((m) => ({
      id: m.student_id,
      name: nameOf(m.student_id),
      joinedAt: m.joined_at,
      lastSeenAt: profileOf.get(m.student_id)?.last_seen_at ?? null,
    }))
    .sort((a, b) => msOrFloor(b.lastSeenAt) - msOrFloor(a.lastSeenAt));
  const realIds = new Set(students.map((s) => s.id));

  const lessonName = new Map(input.lessons.map((l) => [l.id, l.name]));
  const assignments = input.assignments.map((a) => ({
    id: a.id,
    lessonName: lessonName.get(a.lesson_id) ?? null,
    dueDate: a.due_date,
    createdAt: a.created_at,
    completed: new Set(
      input.progress
        .filter((p) => p.assignment_id === a.id && p.completed_at && realIds.has(p.student_id))
        .map((p) => p.student_id),
    ).size,
    assigned: students.length,
  }));

  let rounds: ClassDetail['rounds'] = { available: false, last30Days: null, lastPlayedAt: null, modes: [] };
  if (input.rounds !== null) {
    const recent = input.rounds.filter((r) => nowMs - toMs(r.completed_at) <= ROUNDS_WINDOW_DAYS * DAY_MS);
    const modes = new Map<string, number>();
    for (const r of recent) modes.set(r.game_mode, (modes.get(r.game_mode) ?? 0) + 1);
    const last = Math.max(-Infinity, ...input.rounds.map((r) => msOrFloor(r.completed_at)));
    rounds = {
      available: true,
      last30Days: recent.length,
      lastPlayedAt: Number.isFinite(last) ? new Date(last).toISOString() : null,
      modes: [...modes].map(([mode, n]) => ({ mode, rounds: n })).sort((a, b) => b.rounds - a.rounds || a.mode.localeCompare(b.mode)),
    };
  }

  const teacherId = classroom.teacher_id;
  return {
    classroom: {
      id: classroom.id,
      name: classroom.name,
      joinCode: classroom.join_code,
      language: classroom.language,
      createdAt: classroom.created_at,
    },
    teacher: teacherId
      ? {
          id: teacherId,
          name: nameOf(teacherId),
          lastSeenAt: profileOf.get(teacherId)?.last_seen_at ?? null,
          isTestAccount: isTest(teacherId),
        }
      : null,
    students,
    studentCount: students.length,
    excludedTestStudents: roster.length - real.length,
    assignments,
    rounds,
    games: input.games,
  };
}
