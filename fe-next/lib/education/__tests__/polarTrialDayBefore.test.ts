import { describe, it, expect } from 'vitest';
import {
  POLAR_TRIAL_DAY_BEFORE_BUCKET,
  isPolarTrialChargeSoon,
  pickPolarTrialDayBefore,
  polarTrialManageUrl,
} from '../polarTrialDayBefore';

const END = '2026-10-15T09:00:00.000Z';
const HOUR = 60 * 60 * 1000;
const at = (hoursBefore: number) => Date.parse(END) - hoursBefore * HOUR;

const live = {
  tier: 'pro',
  status: 'trialing',
  source: 'polar' as string | null,
  currentPeriodEnd: END,
  cancelAtPeriodEnd: false,
  alreadySent: [] as string[],
  nowMs: at(20),
};

describe('isPolarTrialChargeSoon', () => {
  it('is true inside the last 36 hours of a live trial', () => {
    expect(isPolarTrialChargeSoon({ ...live, nowMs: at(36) })).toBe(true);
    expect(isPolarTrialChargeSoon({ ...live, nowMs: at(12) })).toBe(true);
    expect(isPolarTrialChargeSoon({ ...live, nowMs: at(0.5) })).toBe(true);
  });

  it('is false earlier than 36 hours out, and once the trial ended', () => {
    expect(isPolarTrialChargeSoon({ ...live, nowMs: at(37) })).toBe(false);
    expect(isPolarTrialChargeSoon({ ...live, nowMs: at(0) })).toBe(false);
    expect(isPolarTrialChargeSoon({ ...live, nowMs: at(-2) })).toBe(false);
  });

  it('is false when they already cancelled: no charge is coming', () => {
    expect(isPolarTrialChargeSoon({ ...live, cancelAtPeriodEnd: true })).toBe(false);
  });

  it('is false for paid, gifted, or unknown-end rows', () => {
    expect(isPolarTrialChargeSoon({ ...live, status: 'active' })).toBe(false);
    expect(isPolarTrialChargeSoon({ ...live, source: 'admin_grant' })).toBe(false);
    expect(isPolarTrialChargeSoon({ ...live, tier: 'free' })).toBe(false);
    expect(isPolarTrialChargeSoon({ ...live, currentPeriodEnd: null })).toBe(false);
    expect(isPolarTrialChargeSoon({ ...live, currentPeriodEnd: 'nope' })).toBe(false);
  });
});

describe('pickPolarTrialDayBefore', () => {
  it('sends once inside the window', () => {
    expect(pickPolarTrialDayBefore(live)).toBe(POLAR_TRIAL_DAY_BEFORE_BUCKET);
    expect(pickPolarTrialDayBefore({ ...live, alreadySent: [POLAR_TRIAL_DAY_BEFORE_BUCKET] })).toBeNull();
  });

  it('a daily run always lands in the window once', () => {
    // Runs 24h apart: whatever the offset, one run falls 12-36h before the end.
    for (let offset = 0; offset < 24; offset += 1) {
      const runs = [offset + 48, offset + 24, offset].map((h) => isPolarTrialChargeSoon({ ...live, nowMs: at(h) }));
      expect(runs.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('links to the plan page in their language', () => {
    expect(polarTrialManageUrl('he')).toBe(
      'https://www.lexiclash.live/he/teacher/upgrade?utm_source=email&utm_campaign=polar_trial_day_before',
    );
  });
});
