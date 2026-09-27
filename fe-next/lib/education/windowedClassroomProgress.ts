/**
 * Windowed classroom progress — 7d / 30d completion and accuracy.
 *
 * Last-lesson digest answers "what happened in the game that just ended".
 * This answers "who showed up this week / this month, and how accurate
 * were they" so a teacher (and the weekly email) has a conversion-grade
 * report sitting next to the Polar CTA.
 *
 * Pure. Callers pass roster + session rows; nothing here fetches or
 * translates. Hebrew names stay Hebrew because they arrived that way.
 */

export type ProgressWindowDays = 7 | 30;

export interface WindowSession {
  studentId: string;
  completedAt: string;
  foundCount: number;
  missedCount: number;
}

export interface WindowRosterStudent {
  studentId: string;
  name: string;
}

export interface WindowStudentProgress {
  studentId: string;
  name: string;
  sessionsCompleted: number;
  accuracyPct: number | null;
  /** True when the student completed at least one session in the window. */
  completed: boolean;
}

export interface WindowedClassroomProgress {
  windowDays: ProgressWindowDays;
  rosterCount: number;
  activeCount: number;
  /** active / roster, rounded percent. Null when the roster is empty. */
  completionPct: number | null;
  /** Mean of students who have a rated session. Null when nobody has words. */
  accuracyPct: number | null;
  students: WindowStudentProgress[];
}

export function windowStartIso(windowDays: ProgressWindowDays, now: number = Date.now()): string {
  return new Date(now - windowDays * 24 * 60 * 60 * 1000).toISOString();
}

const pct = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 100) : 0);

function inWindow(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

export function deriveWindowedClassroomProgress({
  windowDays,
  roster,
  sessions,
  now = Date.now(),
}: {
  windowDays: ProgressWindowDays;
  roster: WindowRosterStudent[];
  sessions: WindowSession[];
  now?: number;
}): WindowedClassroomProgress {
  const startIso = windowStartIso(windowDays, now);
  const endIso = new Date(now).toISOString();
  const windowSessions = sessions.filter((s) => inWindow(s.completedAt, startIso, endIso));

  const byStudent = new Map<string, WindowSession[]>();
  for (const session of windowSessions) {
    const list = byStudent.get(session.studentId) ?? [];
    list.push(session);
    byStudent.set(session.studentId, list);
  }

  const students: WindowStudentProgress[] = roster.map((member) => {
    const theirs = byStudent.get(member.studentId) ?? [];
    let found = 0;
    let missed = 0;
    for (const s of theirs) {
      found += s.foundCount;
      missed += s.missedCount;
    }
    const rated = found + missed;
    return {
      studentId: member.studentId,
      name: member.name,
      sessionsCompleted: theirs.length,
      accuracyPct: rated > 0 ? pct(found, rated) : null,
      completed: theirs.length > 0,
    };
  });

  students.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    const accA = a.accuracyPct ?? -1;
    const accB = b.accuracyPct ?? -1;
    return accB - accA || a.name.localeCompare(b.name);
  });

  const rosterCount = roster.length;
  const activeCount = students.filter((s) => s.completed).length;
  const ratedStudents = students.filter((s) => s.accuracyPct != null);
  const accuracyPct =
    ratedStudents.length > 0
      ? Math.round(ratedStudents.reduce((sum, s) => sum + (s.accuracyPct ?? 0), 0) / ratedStudents.length)
      : null;

  return {
    windowDays,
    rosterCount,
    activeCount,
    completionPct: rosterCount > 0 ? pct(activeCount, rosterCount) : null,
    accuracyPct,
    students,
  };
}
