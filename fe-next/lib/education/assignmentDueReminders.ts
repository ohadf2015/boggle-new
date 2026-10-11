/**
 * Pure picker for assignment due-soon / overdue reminders.
 *
 * Students already see due/overdue on the lesson page. This module decides
 * which TEACHER emails to send: a due-soon reminder (class still has time)
 * and an overdue nudge that deep-links the progress report — the Teacher Pro
 * conversion surface (reports CSV is Pro-gated).
 *
 * Nothing here fetches or sends. The cron loads rows, calls this, then emails.
 */

export const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
export const OVERDUE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export type AssignmentReminderKind = 'due_soon' | 'overdue';
export type AssignmentDueState = 'none' | 'due_soon' | 'overdue';

export interface ReminderAssignment {
  id: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  lessonId: string;
  title: string;
  dueDate: string;
}

export interface ReminderMembership {
  classroomId: string;
  studentId: string;
}

export interface ReminderCompletion {
  assignmentId: string;
  studentId: string;
}

export interface ReminderAlreadySent {
  assignmentId: string;
  recipientId: string;
  kind: AssignmentReminderKind;
}

export interface TeacherAssignmentNudge {
  assignmentId: string;
  classroomId: string;
  classroomName: string;
  title: string;
  dueDate: string;
  missingCount: number;
  kind: AssignmentReminderKind;
}

export interface TeacherReminderPlan {
  teacherId: string;
  dueSoon: TeacherAssignmentNudge[];
  overdue: TeacherAssignmentNudge[];
}

export function assignmentDueState(dueDate: string | null | undefined, now = Date.now()): AssignmentDueState {
  if (!dueDate) return 'none';
  const due = Date.parse(dueDate);
  if (!Number.isFinite(due)) return 'none';
  if (due < now) return 'overdue';
  if (due - now <= DUE_SOON_WINDOW_MS) return 'due_soon';
  return 'none';
}

function sentKey(assignmentId: string, recipientId: string, kind: AssignmentReminderKind): string {
  return `${assignmentId}\0${recipientId}\0${kind}`;
}

export function pickTeacherAssignmentReminders(args: {
  now: number;
  assignments: ReminderAssignment[];
  memberships: ReminderMembership[];
  completions: ReminderCompletion[];
  alreadySent: ReminderAlreadySent[];
}): TeacherReminderPlan[] {
  const { now, assignments, memberships, completions, alreadySent } = args;

  const rosterByClass = new Map<string, string[]>();
  for (const m of memberships) {
    const list = rosterByClass.get(m.classroomId);
    if (list) list.push(m.studentId);
    else rosterByClass.set(m.classroomId, [m.studentId]);
  }

  const completed = new Set<string>();
  for (const c of completions) {
    completed.add(`${c.assignmentId}\0${c.studentId}`);
  }

  const sent = new Set(alreadySent.map((s) => sentKey(s.assignmentId, s.recipientId, s.kind)));

  const byTeacher = new Map<string, TeacherReminderPlan>();

  for (const assignment of assignments) {
    const due = Date.parse(assignment.dueDate);
    if (!Number.isFinite(due)) continue;

    const roster = rosterByClass.get(assignment.classroomId) ?? [];
    if (roster.length === 0) continue;

    let missingCount = 0;
    for (const studentId of roster) {
      if (!completed.has(`${assignment.id}\0${studentId}`)) missingCount += 1;
    }
    if (missingCount === 0) continue;

    const state = assignmentDueState(assignment.dueDate, now);
    if (state === 'none') continue;
    if (state === 'overdue' && now - due > OVERDUE_MAX_AGE_MS) continue;

    if (sent.has(sentKey(assignment.id, assignment.teacherId, state))) continue;

    let plan = byTeacher.get(assignment.teacherId);
    if (!plan) {
      plan = { teacherId: assignment.teacherId, dueSoon: [], overdue: [] };
      byTeacher.set(assignment.teacherId, plan);
    }

    const nudge: TeacherAssignmentNudge = {
      assignmentId: assignment.id,
      classroomId: assignment.classroomId,
      classroomName: assignment.classroomName,
      title: assignment.title,
      dueDate: assignment.dueDate,
      missingCount,
      kind: state,
    };
    if (state === 'due_soon') plan.dueSoon.push(nudge);
    else plan.overdue.push(nudge);
  }

  return [...byTeacher.values()].filter((p) => p.dueSoon.length > 0 || p.overdue.length > 0);
}

export function reminderSendRows(plan: TeacherReminderPlan): ReminderAlreadySent[] {
  const rows: ReminderAlreadySent[] = [];
  for (const n of plan.dueSoon) {
    rows.push({ assignmentId: n.assignmentId, recipientId: plan.teacherId, kind: 'due_soon' });
  }
  for (const n of plan.overdue) {
    rows.push({ assignmentId: n.assignmentId, recipientId: plan.teacherId, kind: 'overdue' });
  }
  return rows;
}

export function reportsUrl(locale: string, classroomId: string): string {
  const loc = locale.toLowerCase().split('-')[0] || 'en';
  return `https://www.lexiclash.live/${loc}/teacher/reports?classroomId=${encodeURIComponent(classroomId)}`;
}

export function studentLessonUrl(locale: string, lessonId: string): string {
  const loc = locale.toLowerCase().split('-')[0] || 'en';
  return `https://www.lexiclash.live/${loc}/student/lessons/${encodeURIComponent(lessonId)}`;
}
