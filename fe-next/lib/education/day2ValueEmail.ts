// Day-2 value email: one note, two days after a teacher's first classroom, with the
// class's own numbers. Pure so the window, the skip rules and the counts are
// testable without a database or an email provider.

import { testEmailReason } from './checkoutTrafficTags';
import { normalizeGrantEmail } from './proGrant';
import { isMachineRequest } from './teacherFunnel';
import type { TeacherLocale } from './types';

const HOUR_MS = 60 * 60 * 1000;
const SITE = 'https://www.lexiclash.live';

/** Claimed in teacher_lifecycle_sends before the send, so a retry cannot double-send. */
export const DAY2_KIND = 'day2_value';
export const DAY2_PERIOD = 'once';

/** Inclusive window. A daily miss still lands; a class older than a week is not a day-2 touch. */
export const DAY2_MIN_HOURS = 48;
export const DAY2_MAX_HOURS = 24 * 7;

const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export function asTeacherLocale(...candidates: Array<string | null | undefined>): TeacherLocale {
  for (const raw of candidates) if (LOCALES.includes(raw as TeacherLocale)) return raw as TeacherLocale;
  return 'en';
}

export function day2ReportUrl(locale: string): string {
  const loc = LOCALES.includes(locale as TeacherLocale) ? locale : 'en';
  return `${SITE}/${loc}/teacher/reports?utm_source=email&utm_campaign=day2_value`;
}

export function day2UpgradeUrl(locale: string): string {
  const loc = LOCALES.includes(locale as TeacherLocale) ? locale : 'en';
  return `${SITE}/${loc}/teacher/upgrade?utm_source=email&utm_campaign=day2_value`;
}

export interface Day2Classroom {
  id: string;
  teacherId: string;
  createdAt: string;
}

export interface Day2Membership {
  classroomId: string;
  studentId: string;
}

export interface Day2Session {
  classroomId: string;
  studentId: string | null;
}

export interface Day2Teacher {
  userId: string;
  email: string;
  fullName: string;
  locale: string | null;
}

export interface Day2Due {
  userId: string;
  email: string;
  fullName: string;
  locale: TeacherLocale;
  firstClassroomAt: string;
  studentsJoined: number;
  gamesPlayed: number;
}

export interface Day2Plan {
  due: Day2Due[];
  skipped: {
    tooSoon: number;
    stale: number;
    noClass: number;
    pro: number;
    converted: number;
    alreadySent: number;
    unverified: number;
    test: number;
  };
}

const emptySkipped = (): Day2Plan['skipped'] => ({
  tooSoon: 0, stale: 0, noClass: 0, pro: 0, converted: 0, alreadySent: 0, unverified: 0, test: 0,
});

function verifiedEmail(raw: string): string | null {
  return normalizeGrantEmail(raw || '');
}

/**
 * One row per teacher whose first classroom is 48h–7d old.
 * Students exclude the teacher's own preview seat. A completed session with no
 * student id still counts as a game; the teacher's own seat does not.
 */
export function planDay2ValueEmails(args: {
  teachers: readonly Day2Teacher[];
  classrooms: readonly Day2Classroom[];
  memberships: readonly Day2Membership[];
  sessions: readonly Day2Session[];
  proUserIds: ReadonlySet<string>;
  convertedUserIds: ReadonlySet<string>;
  alreadySentUserIds: ReadonlySet<string>;
  testUserIds: ReadonlySet<string>;
  nowMs: number;
}): Day2Plan {
  const skipped = emptySkipped();
  const classesByTeacher = new Map<string, Day2Classroom[]>();
  for (const room of args.classrooms) {
    if (!room.teacherId || Number.isNaN(Date.parse(room.createdAt))) continue;
    const list = classesByTeacher.get(room.teacherId) ?? [];
    list.push(room);
    classesByTeacher.set(room.teacherId, list);
  }

  const due: Day2Due[] = [];
  const seenEmail = new Set<string>();
  for (const teacher of args.teachers) {
    const email = verifiedEmail(teacher.email);
    if (!email || !teacher.userId) {
      skipped.unverified++;
      continue;
    }
    if (seenEmail.has(email)) continue;
    seenEmail.add(email);
    if (args.testUserIds.has(teacher.userId) || isMachineRequest(email) || testEmailReason(email)) {
      skipped.test++;
      continue;
    }
    const rooms = classesByTeacher.get(teacher.userId) ?? [];
    if (rooms.length === 0) {
      skipped.noClass++;
      continue;
    }
    const first = rooms.reduce((oldest, room) =>
      Date.parse(room.createdAt) < Date.parse(oldest.createdAt) ? room : oldest);
    const ageHours = (args.nowMs - Date.parse(first.createdAt)) / HOUR_MS;
    if (ageHours < DAY2_MIN_HOURS) {
      skipped.tooSoon++;
      continue;
    }
    if (ageHours > DAY2_MAX_HOURS) {
      skipped.stale++;
      continue;
    }
    if (args.proUserIds.has(teacher.userId)) {
      skipped.pro++;
      continue;
    }
    if (args.convertedUserIds.has(teacher.userId)) {
      skipped.converted++;
      continue;
    }
    if (args.alreadySentUserIds.has(teacher.userId)) {
      skipped.alreadySent++;
      continue;
    }

    const roomIds = new Set(rooms.map((room) => room.id));
    const students = new Set<string>();
    for (const member of args.memberships) {
      if (!roomIds.has(member.classroomId) || member.studentId === teacher.userId) continue;
      students.add(member.studentId);
    }
    let gamesPlayed = 0;
    for (const session of args.sessions) {
      if (!roomIds.has(session.classroomId) || session.studentId === teacher.userId) continue;
      gamesPlayed++;
    }
    due.push({
      userId: teacher.userId,
      email,
      fullName: teacher.fullName || 'Teacher',
      locale: asTeacherLocale(teacher.locale),
      firstClassroomAt: first.createdAt,
      studentsJoined: students.size,
      gamesPlayed,
    });
  }
  return { due, skipped };
}

/** Polar completion events that mean the trial already converted, even before the Pro row is readable. */
export function isTrialConvertedEvent(eventType: string): boolean {
  return eventType === 'checkout.completed'
    || eventType === 'subscription.active'
    || eventType.startsWith('order.');
}
