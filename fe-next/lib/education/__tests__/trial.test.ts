import { describe, it, expect } from 'vitest';
import {
  TEACHER_TRIAL_DAYS,
  TRIAL_URGENT_DAYS,
  teacherTrialExpiry,
  teacherTrialStatus,
} from '../trial';

const DAY = 24 * 60 * 60 * 1000;

describe('teacherTrialExpiry', () => {
  it('returns an ISO timestamp TEACHER_TRIAL_DAYS in the future', () => {
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    const exp = teacherTrialExpiry(now);
    expect(exp).toBe(new Date(now + TEACHER_TRIAL_DAYS * DAY).toISOString());
  });
});

describe('teacherTrialStatus', () => {
  it('returns null for a missing expiry', () => {
    expect(teacherTrialStatus(null, Date.now())).toBeNull();
    expect(teacherTrialStatus(undefined, Date.now())).toBeNull();
  });

  it('returns null for an unparseable expiry', () => {
    expect(teacherTrialStatus('not-a-date', Date.now())).toBeNull();
  });

  it('counts full days remaining (rounded up) when active', () => {
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    const exp = new Date(now + 10 * DAY + DAY / 2).toISOString(); // 10.5 days out
    const s = teacherTrialStatus(exp, now)!;
    expect(s.isExpired).toBe(false);
    expect(s.daysLeft).toBe(11);
    expect(s.isUrgent).toBe(false);
  });

  it('flags urgency when at or under TRIAL_URGENT_DAYS remaining', () => {
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    const exp = new Date(now + (TRIAL_URGENT_DAYS - 1) * DAY).toISOString();
    const s = teacherTrialStatus(exp, now)!;
    expect(s.isUrgent).toBe(true);
    expect(s.isExpired).toBe(false);
  });

  it('marks expired and zeroes the countdown once the deadline passes', () => {
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    const exp = new Date(now - DAY).toISOString();
    const s = teacherTrialStatus(exp, now)!;
    expect(s.isExpired).toBe(true);
    expect(s.daysLeft).toBe(0);
    expect(s.hoursLeft).toBe(0);
    expect(s.isUrgent).toBe(false);
  });

  it('reports hours left for the final day', () => {
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    const exp = new Date(now + 5 * 60 * 60 * 1000).toISOString(); // 5h out
    const s = teacherTrialStatus(exp, now)!;
    expect(s.hoursLeft).toBe(5);
    expect(s.daysLeft).toBe(1);
    expect(s.isUrgent).toBe(true);
  });
});
