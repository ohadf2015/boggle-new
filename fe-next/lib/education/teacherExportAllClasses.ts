/**
 * Pure model for the Teacher Pro "Export all classes" CSV: one row per
 * (classroom x student) across every classroom a teacher owns.
 *
 * Nothing here fetches or translates — the supabase layer
 * (lib/supabase/education/teacherExportAllClasses.ts) shapes raw DB rows into
 * the inputs below, and the UI passes CSV column labels so a Hebrew export is
 * Hebrew end to end (same split as lib/education/assignmentProgressReport.ts).
 *
 * Every count (lessons completed, words mastered, total XP, games played,
 * last active) is scoped to the CLASSROOM's own assigned lessons via
 * lessonAssignments, not to the student's lifetime totals. A student who is a
 * member of two classrooms gets two rows with two different sets of numbers —
 * matching what that classroom's teacher actually assigned.
 */

import { csvEscape } from './assignmentProgressReport';

export interface TeacherExportClassroom {
  id: string;
  name: string;
}

export interface TeacherExportMembership {
  classroomId: string;
  studentId: string;
}

export interface TeacherExportProfile {
  studentId: string;
  /** null when the caller has no real (non-placeholder) name to offer —
   *  the row falls back to a translated anonymous-student label, never a
   *  hardcoded English string. */
  name: string | null;
}

export interface TeacherExportLessonAssignment {
  classroomId: string;
  lessonId: string;
}

export interface TeacherExportProgress {
  studentId: string;
  lessonId: string;
  totalXp: number;
  wordsMasteredCount: number;
  lastPracticeDate: string | null;
  completedAt: string | null;
}

export interface TeacherExportSession {
  studentId: string;
  lessonId: string;
  completedAt: string | null;
}

export interface TeacherExportRow {
  classroomId: string;
  classroomName: string;
  studentId: string;
  /** null when no profile row matched the member (e.g. an orphaned
   *  membership) — the CSV layer substitutes a translated placeholder rather
   *  than baking in a hardcoded English fallback. */
  studentName: string | null;
  lessonsCompleted: number;
  wordsMastered: number;
  totalXp: number;
  lastActive: string | null;
  gamesPlayed: number;
}

export function buildTeacherExportRows(args: {
  classrooms: TeacherExportClassroom[];
  memberships: TeacherExportMembership[];
  profiles: TeacherExportProfile[];
  lessonAssignments: TeacherExportLessonAssignment[];
  progress: TeacherExportProgress[];
  sessions: TeacherExportSession[];
}): TeacherExportRow[] {
  const { classrooms, memberships, profiles, lessonAssignments, progress, sessions } = args;
  if (classrooms.length === 0) return [];

  const nameByStudent = new Map(profiles.map((p) => [p.studentId, p.name]));

  const lessonIdsByClassroom = new Map<string, Set<string>>();
  for (const la of lessonAssignments) {
    if (!lessonIdsByClassroom.has(la.classroomId)) lessonIdsByClassroom.set(la.classroomId, new Set());
    lessonIdsByClassroom.get(la.classroomId)!.add(la.lessonId);
  }

  const progressByStudent = new Map<string, TeacherExportProgress[]>();
  for (const p of progress) {
    if (!progressByStudent.has(p.studentId)) progressByStudent.set(p.studentId, []);
    progressByStudent.get(p.studentId)!.push(p);
  }

  const sessionsByStudent = new Map<string, TeacherExportSession[]>();
  for (const s of sessions) {
    if (!sessionsByStudent.has(s.studentId)) sessionsByStudent.set(s.studentId, []);
    sessionsByStudent.get(s.studentId)!.push(s);
  }

  const membershipsByClassroom = new Map<string, TeacherExportMembership[]>();
  for (const m of memberships) {
    if (!membershipsByClassroom.has(m.classroomId)) membershipsByClassroom.set(m.classroomId, []);
    membershipsByClassroom.get(m.classroomId)!.push(m);
  }

  const rows: TeacherExportRow[] = [];

  for (const classroom of classrooms) {
    const lessonIds = lessonIdsByClassroom.get(classroom.id) ?? new Set<string>();
    const classroomMemberships = membershipsByClassroom.get(classroom.id) ?? [];

    for (const membership of classroomMemberships) {
      const { studentId } = membership;
      const studentProgress = (progressByStudent.get(studentId) ?? []).filter((p) => lessonIds.has(p.lessonId));
      const studentSessions = (sessionsByStudent.get(studentId) ?? []).filter((s) => lessonIds.has(s.lessonId));

      const lessonsCompleted = studentProgress.filter((p) => p.completedAt != null).length;
      const wordsMastered = studentProgress.reduce((sum, p) => sum + p.wordsMasteredCount, 0);
      const totalXp = studentProgress.reduce((sum, p) => sum + p.totalXp, 0);
      const gamesPlayed = studentSessions.filter((s) => s.completedAt != null).length;

      let lastActive: string | null = null;
      for (const p of studentProgress) {
        if (p.lastPracticeDate && (!lastActive || p.lastPracticeDate > lastActive)) lastActive = p.lastPracticeDate;
      }
      for (const s of studentSessions) {
        if (s.completedAt && (!lastActive || s.completedAt > lastActive)) lastActive = s.completedAt;
      }

      rows.push({
        classroomId: classroom.id,
        classroomName: classroom.name,
        studentId,
        studentName: nameByStudent.get(studentId) ?? null,
        lessonsCompleted,
        wordsMastered,
        totalXp,
        lastActive,
        gamesPlayed,
      });
    }
  }

  return rows;
}

export interface TeacherExportCsvLabels {
  classroom: string;
  student: string;
  lessonsCompleted: string;
  wordsMastered: string;
  totalXp: string;
  lastActive: string;
  gamesPlayed: string;
  /** Template containing `{{id}}`, e.g. "Student {{id}}" — same convention
   *  as teacher.reports.assignmentProgress.anonymousStudent. */
  anonymousStudent: string;
}

export function teacherExportToCsv(rows: TeacherExportRow[], labels: TeacherExportCsvLabels): string {
  const header = [
    labels.classroom,
    labels.student,
    labels.lessonsCompleted,
    labels.wordsMastered,
    labels.totalXp,
    labels.lastActive,
    labels.gamesPlayed,
  ]
    .map(csvEscape)
    .join(',');

  const body = rows.map((row) =>
    [
      csvEscape(row.classroomName),
      csvEscape(
        row.studentName ??
          // LanguageContext's loadTranslation() normalizes every {{id}}
          // template to ICU {id} before t() ever sees it, and t() called
          // with no params returns its template untouched (interpolate()
          // short-circuits on an empty params object) — so `labels.anonymousStudent`
          // reaches this function as `{id}`, NOT `{{id}}`, in production. Match
          // both so this never silently regresses to a literal "{id}"/"{{id}}"
          // in the exported CSV.
          labels.anonymousStudent.replace(/\{\{id\}\}|\{id\}/, row.studentId.slice(0, 8)),
      ),
      String(row.lessonsCompleted),
      String(row.wordsMastered),
      String(row.totalXp),
      row.lastActive == null ? '' : csvEscape(row.lastActive),
      String(row.gamesPlayed),
    ].join(','),
  );

  return [header, ...body].join('\n');
}
