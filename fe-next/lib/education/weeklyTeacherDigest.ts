/**
 * Weekly teacher progress digest — one classroom summary per teacher.
 *
 * Pure fold used by the Monday cron. Polar CTA is appended by the email
 * template, not here, so a Pro teacher can get the numbers without an upsell.
 *
 * Polar Teacher Pro trial expiry is a KEY, not a sentence, so the email can
 * render it in the teacher's locale. Distinct from the access trial.
 */

import {
  deriveWindowedClassroomProgress,
  type ProgressWindowDays,
  type WindowRosterStudent,
  type WindowSession,
  type WindowedClassroomProgress,
} from './windowedClassroomProgress';

export const POLAR_TRIAL_EXPIRED_DIGEST_KEY = 'teacher.digest.polarTrialExpiredLine' as const;
export const POLAR_TRIAL_ACTIVE_DIGEST_KEY = 'teacher.digest.polarTrialActiveLine' as const;

export interface WeeklyClassroomInput {
  classroomId: string;
  classroomName: string;
  roster: WindowRosterStudent[];
  sessions: WindowSession[];
}

export interface WeeklyTeacherDigestClassroom {
  classroomId: string;
  classroomName: string;
  progress: WindowedClassroomProgress;
}

export interface WeeklyTeacherDigest {
  teacherId: string;
  email: string;
  fullName: string;
  locale: string;
  hasPro: boolean;
  /** Polar Teacher Pro trial ended and was not converted. */
  polarTrialExpired: boolean;
  /** Set only when polarTrialExpired && !hasPro. */
  polarTrialExpiredLineKey: typeof POLAR_TRIAL_EXPIRED_DIGEST_KEY | null;
  /** Live Polar trial — days remaining, including 0 for "ends today". */
  polarTrialActive: boolean;
  polarTrialDaysLeft: number | null;
  polarTrialActiveLineKey: typeof POLAR_TRIAL_ACTIVE_DIGEST_KEY | null;
  classrooms: WeeklyTeacherDigestClassroom[];
}

export function isoWeekKey(now: number = Date.now()): string {
  const d = new Date(now);
  // ISO week: Thursday of this week determines the year/week.
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function buildWeeklyTeacherDigest({
  teacherId,
  email,
  fullName,
  locale,
  hasPro,
  polarTrialExpired = false,
  polarTrialDaysLeft = null,
  classrooms,
  windowDays = 7,
  now = Date.now(),
}: {
  teacherId: string;
  email: string;
  fullName: string;
  locale: string;
  hasPro: boolean;
  polarTrialExpired?: boolean;
  /** Whole days left on a live Polar trial. Null if not trialing. */
  polarTrialDaysLeft?: number | null;
  classrooms: WeeklyClassroomInput[];
  windowDays?: ProgressWindowDays;
  now?: number;
}): WeeklyTeacherDigest {
  const expiredUpsell = polarTrialExpired && !hasPro;
  const activeTrial =
    hasPro && polarTrialDaysLeft !== null && polarTrialDaysLeft !== undefined;
  return {
    teacherId,
    email,
    fullName,
    locale,
    hasPro,
    polarTrialExpired: expiredUpsell,
    polarTrialExpiredLineKey: expiredUpsell ? POLAR_TRIAL_EXPIRED_DIGEST_KEY : null,
    polarTrialActive: activeTrial,
    polarTrialDaysLeft: activeTrial ? polarTrialDaysLeft : null,
    polarTrialActiveLineKey: activeTrial ? POLAR_TRIAL_ACTIVE_DIGEST_KEY : null,
    classrooms: classrooms.map((c) => ({
      classroomId: c.classroomId,
      classroomName: c.classroomName,
      progress: deriveWindowedClassroomProgress({
        windowDays,
        roster: c.roster,
        sessions: c.sessions,
        now,
      }),
    })),
  };
}

/** Skip a teacher with no classrooms — nothing to report, nothing to convert. */
export function shouldSendWeeklyDigest(digest: WeeklyTeacherDigest): boolean {
  return digest.classrooms.length > 0 && Boolean(digest.email);
}

export interface WeeklyTeacherRow {
  userId: string;
  email: string;
  fullName: string;
  locale: string;
}

export interface WeeklyClassroomRow {
  id: string;
  name: string;
  teacherId: string;
}

export interface WeeklyMembershipRow {
  classroomId: string;
  studentId: string;
}

export interface WeeklySessionRow {
  classroomId: string;
  studentId: string;
  completedAt: string;
  foundCount: number;
  missedCount: number;
}

/** Fold already-fetched rows into one digest per teacher. Dedupes by email. */
export function assembleWeeklyDigests({
  teachers,
  classrooms,
  memberships,
  sessions,
  proUserIds,
  expiredTrialUserIds = new Set<string>(),
  trialingDaysByUser = new Map<string, number>(),
  now = Date.now(),
}: {
  teachers: WeeklyTeacherRow[];
  classrooms: WeeklyClassroomRow[];
  memberships: WeeklyMembershipRow[];
  sessions: WeeklySessionRow[];
  proUserIds: Set<string>;
  expiredTrialUserIds?: Set<string>;
  /** userId → whole days remaining on a live Polar trial. */
  trialingDaysByUser?: Map<string, number>;
  now?: number;
}): WeeklyTeacherDigest[] {
  const seenEmail = new Set<string>();
  const roomsByTeacher = new Map<string, WeeklyClassroomRow[]>();
  for (const room of classrooms) {
    const list = roomsByTeacher.get(room.teacherId) ?? [];
    list.push(room);
    roomsByTeacher.set(room.teacherId, list);
  }
  const rosterByRoom = new Map<string, WeeklyMembershipRow[]>();
  for (const m of memberships) {
    const list = rosterByRoom.get(m.classroomId) ?? [];
    list.push(m);
    rosterByRoom.set(m.classroomId, list);
  }
  const sessionsByRoom = new Map<string, WeeklySessionRow[]>();
  for (const s of sessions) {
    const list = sessionsByRoom.get(s.classroomId) ?? [];
    list.push(s);
    sessionsByRoom.set(s.classroomId, list);
  }

  const out: WeeklyTeacherDigest[] = [];
  for (const teacher of teachers) {
    const email = teacher.email.trim().toLowerCase();
    if (!email || seenEmail.has(email)) continue;
    seenEmail.add(email);
    const rooms = roomsByTeacher.get(teacher.userId) ?? [];
    const digest = buildWeeklyTeacherDigest({
      teacherId: teacher.userId,
      email: teacher.email,
      fullName: teacher.fullName,
      locale: teacher.locale,
      hasPro: proUserIds.has(teacher.userId),
      polarTrialExpired: expiredTrialUserIds.has(teacher.userId),
      polarTrialDaysLeft: trialingDaysByUser.has(teacher.userId)
        ? trialingDaysByUser.get(teacher.userId)!
        : null,
      now,
      classrooms: rooms.map((room) => ({
        classroomId: room.id,
        classroomName: room.name,
        roster: (rosterByRoom.get(room.id) ?? []).map((m) => ({
          studentId: m.studentId,
          name: m.studentId,
        })),
        sessions: (sessionsByRoom.get(room.id) ?? []).map((s) => ({
          studentId: s.studentId,
          completedAt: s.completedAt,
          foundCount: s.foundCount,
          missedCount: s.missedCount,
        })),
      })),
    });
    if (shouldSendWeeklyDigest(digest)) out.push(digest);
  }
  return out;
}
