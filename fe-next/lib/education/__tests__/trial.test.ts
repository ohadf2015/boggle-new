import { describe, it, expect } from 'vitest';
import {
  TEACHER_TRIAL_DAYS,
  TRIAL_URGENT_DAYS,
  teacherTrialExpiry,
  teacherTrialStatus,
  isEligibleForTeacherProUpgradeCta,
  isTrialReminderWindow,
  trialReminderDismissKey,
  isTrialReminderDismissed,
  persistTrialReminderDismissed,
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

function statusInDays(days: number, now = Date.parse('2026-06-26T00:00:00.000Z')) {
  const exp = new Date(now + days * DAY).toISOString();
  return teacherTrialStatus(exp, now);
}

describe('isEligibleForTeacherProUpgradeCta', () => {
  const active = statusInDays(10);

  it('is true for an active-trial teacher who is not Pro', () => {
    expect(isEligibleForTeacherProUpgradeCta({ trial: active, hasPro: false })).toBe(true);
  });

  it('is true across the whole active trial, not only the 7-day banner window', () => {
    expect(
      isEligibleForTeacherProUpgradeCta({ trial: statusInDays(10), hasPro: false }),
    ).toBe(true);
    expect(
      isEligibleForTeacherProUpgradeCta({ trial: statusInDays(2), hasPro: false }),
    ).toBe(true);
  });

  it('is false for Pro, loading, expired, or missing trial', () => {
    expect(isEligibleForTeacherProUpgradeCta({ trial: active, hasPro: true })).toBe(false);
    expect(
      isEligibleForTeacherProUpgradeCta({ trial: active, hasPro: false, proLoading: true }),
    ).toBe(false);
    expect(
      isEligibleForTeacherProUpgradeCta({ trial: active, hasPro: false, accessLoading: true }),
    ).toBe(false);
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    const expired = teacherTrialStatus(new Date(now - DAY).toISOString(), now);
    expect(isEligibleForTeacherProUpgradeCta({ trial: expired, hasPro: false })).toBe(false);
    expect(isEligibleForTeacherProUpgradeCta({ trial: null, hasPro: false })).toBe(false);
  });

  it('shows for a teacher with no free window who has not started a card trial', () => {
    expect(isEligibleForTeacherProUpgradeCta({ trial: null, hasPro: false, trialUsed: false })).toBe(true);
    expect(isEligibleForTeacherProUpgradeCta({ trial: null, hasPro: false, trialUsed: true })).toBe(false);
    expect(isEligibleForTeacherProUpgradeCta({ trial: null, hasPro: true, trialUsed: false })).toBe(false);
  });
});

describe('isTrialReminderWindow', () => {
  function makeTrial(daysLeft: number, isExpired = false) {
    return {
      expiresAt: '2026-07-01T00:00:00.000Z',
      msLeft: isExpired ? -1000 : daysLeft * DAY,
      daysLeft: isExpired ? 0 : daysLeft,
      hoursLeft: isExpired ? 0 : daysLeft * 24,
      isExpired,
      isUrgent: !isExpired && daysLeft <= TRIAL_URGENT_DAYS,
    };
  }

  it('is true for daysLeft 3 and 1', () => {
    expect(isTrialReminderWindow(makeTrial(3))).toBe(true);
    expect(isTrialReminderWindow(makeTrial(1))).toBe(true);
  });

  it('is false for daysLeft 4', () => {
    expect(isTrialReminderWindow(makeTrial(4))).toBe(false);
  });

  it('is false for expired trial', () => {
    expect(isTrialReminderWindow(makeTrial(0, true))).toBe(false);
  });

  it('is false for null or undefined', () => {
    expect(isTrialReminderWindow(null)).toBe(false);
    expect(isTrialReminderWindow(undefined)).toBe(false);
  });
});

describe('trial reminder dismiss persistence', () => {
  const expiresAt = '2026-07-01T00:00:00.000Z';

  function memStorage() {
    const mem = new Map<string, string>();
    return {
      mem,
      storage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mem.set(k, v);
        },
      },
    };
  }

  it('keys dismiss to this trial deadline', () => {
    expect(trialReminderDismissKey(expiresAt)).toContain(expiresAt);
  });

  it('persist and read round-trip; a different expiry is not dismissed', () => {
    const { storage } = memStorage();
    expect(isTrialReminderDismissed(storage, expiresAt)).toBe(false);
    persistTrialReminderDismissed(storage, expiresAt);
    expect(isTrialReminderDismissed(storage, expiresAt)).toBe(true);
    expect(isTrialReminderDismissed(storage, '2026-08-01T00:00:00.000Z')).toBe(false);
  });
});
