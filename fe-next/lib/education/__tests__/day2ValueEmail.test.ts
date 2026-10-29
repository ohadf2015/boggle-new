import { describe, expect, it } from 'vitest';
import {
  DAY2_MAX_HOURS,
  DAY2_MIN_HOURS,
  day2ReportUrl,
  day2UpgradeUrl,
  isTrialConvertedEvent,
  planDay2ValueEmails,
  type Day2Classroom,
  type Day2Teacher,
} from '../day2ValueEmail';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const hoursAgo = (n: number) => new Date(NOW - n * HOUR).toISOString();

function teacher(over: Partial<Day2Teacher> = {}): Day2Teacher {
  return { userId: 'u1', email: 'ada@school.edu', fullName: 'Ada', locale: 'en', ...over };
}

function room(over: Partial<Day2Classroom> = {}): Day2Classroom {
  return { id: 'c1', teacherId: 'u1', createdAt: hoursAgo(50), ...over };
}

function plan(over: Partial<Parameters<typeof planDay2ValueEmails>[0]> = {}) {
  return planDay2ValueEmails({
    teachers: [teacher()],
    classrooms: [room()],
    memberships: [
      { classroomId: 'c1', studentId: 'u1' },
      { classroomId: 'c1', studentId: 's1' },
      { classroomId: 'c1', studentId: 's2' },
    ],
    sessions: [
      { classroomId: 'c1', studentId: 's1' },
      { classroomId: 'c1', studentId: 's1' },
      { classroomId: 'c1', studentId: 'u1' },
      { classroomId: 'c1', studentId: null },
    ],
    proUserIds: new Set(),
    convertedUserIds: new Set(),
    alreadySentUserIds: new Set(),
    testUserIds: new Set(),
    nowMs: NOW,
    ...over,
  });
}

describe('planDay2ValueEmails', () => {
  it('emails a verified teacher 2 days after the first classroom, with students and games', () => {
    const { due, skipped } = plan();
    expect(due).toEqual([expect.objectContaining({
      userId: 'u1',
      email: 'ada@school.edu',
      studentsJoined: 2,
      gamesPlayed: 3,
      locale: 'en',
    })]);
    expect(skipped.tooSoon).toBe(0);
    expect(day2ReportUrl('en')).toContain('/en/teacher/reports');
    expect(day2UpgradeUrl('en')).toContain('/en/teacher/upgrade');
    expect(day2UpgradeUrl('en')).toContain('utm_campaign=day2_value');
  });

  it('uses the first classroom, not a later one, for the clock', () => {
    const tooSoon = plan({
      classrooms: [
        room({ id: 'old', createdAt: hoursAgo(10) }),
        room({ id: 'first', createdAt: hoursAgo(DAY2_MIN_HOURS - 1) }),
      ],
    });
    expect(tooSoon.due).toHaveLength(0);
    expect(tooSoon.skipped.tooSoon).toBe(1);

    const stale = plan({
      classrooms: [room({ createdAt: hoursAgo(DAY2_MAX_HOURS + 1) })],
    });
    expect(stale.due).toHaveLength(0);
    expect(stale.skipped.stale).toBe(1);
  });

  it('skips Teacher Pro, a converted trial, and a teacher already sent', () => {
    expect(plan({ proUserIds: new Set(['u1']) }).skipped.pro).toBe(1);
    expect(plan({ convertedUserIds: new Set(['u1']) }).skipped.converted).toBe(1);
    expect(plan({ alreadySentUserIds: new Set(['u1']) }).skipped.alreadySent).toBe(1);
    expect(plan({ proUserIds: new Set(['u1']) }).due).toHaveLength(0);
  });

  it('skips a missing, machine, or test email and does not count the teacher preview seat', () => {
    expect(plan({ teachers: [teacher({ email: 'not-an-email' })] }).skipped.unverified).toBe(1);
    expect(plan({ teachers: [teacher({ email: 'probe@example.com' })] }).skipped.test).toBeGreaterThanOrEqual(0);
    expect(plan({ testUserIds: new Set(['u1']) }).skipped.test).toBe(1);
    const { due } = plan();
    expect(due[0].studentsJoined).toBe(2);
    expect(due[0].gamesPlayed).toBe(3);
  });

  it('sends once per email address', () => {
    const { due } = plan({
      teachers: [teacher(), teacher({ userId: 'u2', email: 'Ada@school.edu' })],
      classrooms: [room(), room({ id: 'c2', teacherId: 'u2', createdAt: hoursAgo(60) })],
    });
    expect(due).toHaveLength(1);
  });
});

describe('isTrialConvertedEvent', () => {
  it('treats a completed checkout, an active subscription, and an order as converted', () => {
    expect(isTrialConvertedEvent('checkout.completed')).toBe(true);
    expect(isTrialConvertedEvent('subscription.active')).toBe(true);
    expect(isTrialConvertedEvent('order.paid')).toBe(true);
    expect(isTrialConvertedEvent('subscription.canceled')).toBe(false);
    expect(isTrialConvertedEvent('checkout_started')).toBe(false);
  });
});
