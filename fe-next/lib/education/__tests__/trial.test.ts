import { describe, it, expect } from 'vitest';
import {
  TEACHER_TRIAL_DAYS,
  TRIAL_URGENT_DAYS,
  TRIAL_UPGRADE_NUDGE_DAYS,
  teacherTrialExpiry,
  teacherTrialStatus,
  isTrialUpgradeNudgeWindow,
  isEligibleForTeacherProUpgradeCta,
  isTrialUpgradeNudgeDismissed,
  persistTrialUpgradeNudgeDismissed,
  trialUpgradeNudgeDismissKey,
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

describe('isTrialUpgradeNudgeWindow', () => {
  it('is false with no trial', () => {
    expect(isTrialUpgradeNudgeWindow(null)).toBe(false);
    expect(isTrialUpgradeNudgeWindow(undefined)).toBe(false);
  });

  it(`is true at the ${TRIAL_UPGRADE_NUDGE_DAYS}-day boundary and inside it`, () => {
    expect(isTrialUpgradeNudgeWindow(statusInDays(TRIAL_UPGRADE_NUDGE_DAYS))).toBe(true);
    expect(isTrialUpgradeNudgeWindow(statusInDays(3))).toBe(true);
    expect(isTrialUpgradeNudgeWindow(statusInDays(1))).toBe(true);
  });

  it(`is false with more than ${TRIAL_UPGRADE_NUDGE_DAYS} days left`, () => {
    expect(isTrialUpgradeNudgeWindow(statusInDays(TRIAL_UPGRADE_NUDGE_DAYS + 1))).toBe(false);
    expect(isTrialUpgradeNudgeWindow(statusInDays(10))).toBe(false);
  });

  it('is false once the trial has expired — that is a different banner', () => {
    const now = Date.parse('2026-06-26T00:00:00.000Z');
    expect(isTrialUpgradeNudgeWindow(teacherTrialStatus(new Date(now - DAY).toISOString(), now))).toBe(
      false,
    );
  });
});

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
});

describe('trial upgrade-nudge dismiss persistence', () => {
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

  it('keys dismiss to this trial deadline, not a global flag', () => {
    expect(trialUpgradeNudgeDismissKey(expiresAt)).toContain(expiresAt);
  });

  it('reads as not dismissed when storage is missing or empty', () => {
    expect(isTrialUpgradeNudgeDismissed(null, expiresAt)).toBe(false);
    const { storage } = memStorage();
    expect(isTrialUpgradeNudgeDismissed(storage, expiresAt)).toBe(false);
  });

  it('persists a dismiss so a reload stays quiet for this deadline only', () => {
    const { mem, storage } = memStorage();
    persistTrialUpgradeNudgeDismissed(storage, expiresAt);
    expect(mem.get(trialUpgradeNudgeDismissKey(expiresAt))).toBe('1');
    expect(isTrialUpgradeNudgeDismissed(storage, expiresAt)).toBe(true);
    expect(isTrialUpgradeNudgeDismissed(storage, '2026-08-01T00:00:00.000Z')).toBe(false);
  });
});
