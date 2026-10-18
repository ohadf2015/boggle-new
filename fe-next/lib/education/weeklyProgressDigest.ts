/**
 * Weekly teacher progress digest — the numbers that sit between
 * activation and Teacher Pro conversion.
 *
 * Last-lesson digest answers "what just happened". This answers "how did
 * this week compare to last week": students active, games/words completed,
 * assignment completion, week-over-week delta. Pure — callers fetch.
 */

import type { WindowRosterStudent, WindowSession } from './windowedClassroomProgress';

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Polar 14-day trial: day 7 = 7 whole days remaining. */
export const POLAR_TRIAL_DAY7_DAYS_LEFT = 7;

/**
 * In-app HQ card: exact mid-trial day. Teachers open HQ across the week,
 * so a one-day window is the conversion beat the card is for.
 */
export function isPolarTrialDay7(daysLeft: number | null | undefined): boolean {
  return daysLeft === POLAR_TRIAL_DAY7_DAYS_LEFT;
}

/**
 * Weekly Monday email catch-up: remaining days 5–7 still count as the
 * day-7 beat so a trial that started mid-week is not skipped. Day 10
 * (≤4 days left) owns the later nudge.
 */
export function isPolarTrialDay7EmailWindow(daysLeft: number | null | undefined): boolean {
  return typeof daysLeft === 'number' && daysLeft >= 5 && daysLeft <= POLAR_TRIAL_DAY7_DAYS_LEFT;
}

export interface WeeklyAssignmentCompletion {
  completedAt: string;
}

export interface WeeklyProgressSlice {
  studentsActive: number;
  rosterCount: number;
  gamesCompleted: number;
  wordsCompleted: number;
  assignmentCompleted: number;
  assignmentExpected: number;
  /** submitted / expected, rounded percent. Null when nothing was assigned. */
  assignmentCompletionPct: number | null;
}

export interface WeeklyProgressWow {
  studentsActive: number;
  gamesCompleted: number;
  wordsCompleted: number;
  /** Percentage-point delta. Null when either week had no assignments. */
  assignmentCompletionPctPoints: number | null;
}

export interface WeeklyStudentMovement {
  studentId: string;
  name: string;
  thisWeekSessions: number;
  lastWeekSessions: number;
  thisWeekAccuracyPct: number | null;
  lastWeekAccuracyPct: number | null;
  /** Percentage-point delta. Null when either week is unrated. */
  accuracyDelta: number | null;
  inactive7d: boolean;
}

export interface WeeklyProgressDigestMetrics {
  thisWeek: WeeklyProgressSlice;
  lastWeek: WeeklyProgressSlice;
  wow: WeeklyProgressWow;
  /** Mean this-week accuracy of students with a rated session. */
  averageScorePct: number | null;
  inactiveCount: number;
  students: WeeklyStudentMovement[];
}

/** Paid Pro (not a live Polar trial) never sees a digest upgrade CTA. */
export function shouldShowDigestUpgradeCta({
  isPaidPro,
  isTrialing,
  trialExpired,
  overFreeTierCaps,
}: {
  isPaidPro: boolean;
  isTrialing: boolean;
  trialExpired: boolean;
  overFreeTierCaps: boolean;
}): boolean {
  if (isPaidPro) return false;
  return isTrialing || trialExpired || overFreeTierCaps;
}

const pct = (num: number, den: number): number | null =>
  den > 0 ? Math.round((num / den) * 100) : null;

function inRange(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

function studentWindowStats(
  sessions: WindowSession[],
  studentId: string,
  startIso: string,
  endIso: string,
): { sessions: number; accuracyPct: number | null } {
  let found = 0;
  let missed = 0;
  let count = 0;
  for (const session of sessions) {
    if (session.studentId !== studentId || !inRange(session.completedAt, startIso, endIso)) continue;
    count += 1;
    found += Math.max(0, session.foundCount);
    missed += Math.max(0, session.missedCount);
  }
  const rated = found + missed;
  return { sessions: count, accuracyPct: rated > 0 ? Math.round((found / rated) * 100) : null };
}

export function deriveWeeklyStudentMovement({
  roster,
  sessions,
  now = Date.now(),
}: {
  roster: WindowRosterStudent[];
  sessions: WindowSession[];
  now?: number;
}): WeeklyStudentMovement[] {
  const thisEnd = new Date(now).toISOString();
  const thisStart = new Date(now - WEEK_MS).toISOString();
  const lastStart = new Date(now - 2 * WEEK_MS).toISOString();
  const lastEnd = new Date(now - WEEK_MS - 1).toISOString();
  return roster.map((member) => {
    const thisWeek = studentWindowStats(sessions, member.studentId, thisStart, thisEnd);
    const lastWeek = studentWindowStats(sessions, member.studentId, lastStart, lastEnd);
    const accuracyDelta =
      thisWeek.accuracyPct == null || lastWeek.accuracyPct == null
        ? null
        : thisWeek.accuracyPct - lastWeek.accuracyPct;
    return {
      studentId: member.studentId,
      name: member.name,
      thisWeekSessions: thisWeek.sessions,
      lastWeekSessions: lastWeek.sessions,
      thisWeekAccuracyPct: thisWeek.accuracyPct,
      lastWeekAccuracyPct: lastWeek.accuracyPct,
      accuracyDelta,
      inactive7d: thisWeek.sessions === 0,
    };
  });
}

function sliceForWindow({
  roster,
  sessions,
  assignmentCompletions,
  assignmentExpected,
  startIso,
  endIso,
}: {
  roster: WindowRosterStudent[];
  sessions: WindowSession[];
  assignmentCompletions: WeeklyAssignmentCompletion[];
  assignmentExpected: number;
  startIso: string;
  endIso: string;
}): WeeklyProgressSlice {
  const windowSessions = sessions.filter((s) => inRange(s.completedAt, startIso, endIso));
  const active = new Set<string>();
  let gamesCompleted = 0;
  let wordsCompleted = 0;
  for (const session of windowSessions) {
    gamesCompleted += 1;
    wordsCompleted += Math.max(0, session.foundCount);
    active.add(session.studentId);
  }
  const rosterIds = new Set(roster.map((r) => r.studentId));
  const studentsActive = [...active].filter((id) => rosterIds.has(id) || rosterIds.size === 0).length;
  const assignmentCompleted = assignmentCompletions.filter((row) =>
    inRange(row.completedAt, startIso, endIso),
  ).length;
  const expected = Math.max(0, assignmentExpected);
  return {
    studentsActive: rosterIds.size > 0 ? studentsActive : active.size,
    rosterCount: roster.length,
    gamesCompleted,
    wordsCompleted,
    assignmentCompleted,
    assignmentExpected: expected,
    assignmentCompletionPct: pct(assignmentCompleted, expected),
  };
}

export function deriveWeeklyProgressDigest({
  roster,
  sessions,
  assignmentCompletions = [],
  assignmentExpected = 0,
  now = Date.now(),
}: {
  roster: WindowRosterStudent[];
  sessions: WindowSession[];
  assignmentCompletions?: WeeklyAssignmentCompletion[];
  /** Roster × open assignments. 0 means "none assigned" (pct stays null). */
  assignmentExpected?: number;
  now?: number;
}): WeeklyProgressDigestMetrics {
  const thisEnd = new Date(now).toISOString();
  const thisStart = new Date(now - WEEK_MS).toISOString();
  const lastStart = new Date(now - 2 * WEEK_MS).toISOString();
  const lastEnd = new Date(now - WEEK_MS - 1).toISOString();

  const thisWeek = sliceForWindow({
    roster,
    sessions,
    assignmentCompletions,
    assignmentExpected,
    startIso: thisStart,
    endIso: thisEnd,
  });
  const lastWeek = sliceForWindow({
    roster,
    sessions,
    assignmentCompletions,
    assignmentExpected,
    startIso: lastStart,
    endIso: lastEnd,
  });

  const assignmentWow =
    thisWeek.assignmentCompletionPct == null || lastWeek.assignmentCompletionPct == null
      ? null
      : thisWeek.assignmentCompletionPct - lastWeek.assignmentCompletionPct;

  const students = deriveWeeklyStudentMovement({ roster, sessions, now });
  const rated = students.filter((s) => s.thisWeekAccuracyPct != null);
  const averageScorePct =
    rated.length > 0
      ? Math.round(rated.reduce((sum, s) => sum + (s.thisWeekAccuracyPct ?? 0), 0) / rated.length)
      : null;

  return {
    thisWeek,
    lastWeek,
    wow: {
      studentsActive: thisWeek.studentsActive - lastWeek.studentsActive,
      gamesCompleted: thisWeek.gamesCompleted - lastWeek.gamesCompleted,
      wordsCompleted: thisWeek.wordsCompleted - lastWeek.wordsCompleted,
      assignmentCompletionPctPoints: assignmentWow,
    },
    averageScorePct,
    inactiveCount: students.filter((s) => s.inactive7d).length,
    students,
  };
}

export function formatWowDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}
