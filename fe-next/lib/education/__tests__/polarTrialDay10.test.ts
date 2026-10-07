import { describe, it, expect } from 'vitest';
import {
  POLAR_TRIAL_DAY10_BUCKET,
  pickPolarTrialDay10Nudge,
  polarTrialUpgradeUrl,
} from '../polarTrialDay10';

const END = '2026-10-15T00:00:00.000Z';
const NOW = Date.parse('2026-10-11T00:00:00.000Z'); // 4 days left = day 10 of a 14-day trial

const live = {
  tier: 'pro',
  status: 'trialing',
  source: 'polar' as string | null,
  currentPeriodEnd: END,
  alreadySent: [] as string[],
  nowMs: NOW,
};

describe('pickPolarTrialDay10Nudge', () => {
  it('sends day-10 when a Polar Pro trial has 4 days left', () => {
    expect(pickPolarTrialDay10Nudge(live)).toBe(POLAR_TRIAL_DAY10_BUCKET);
  });

  it('still sends on day 11-13 (catch-up) while the trial is live', () => {
    expect(pickPolarTrialDay10Nudge({ ...live, nowMs: Date.parse('2026-10-12T00:00:00.000Z') })).toBe(
      POLAR_TRIAL_DAY10_BUCKET,
    );
    expect(pickPolarTrialDay10Nudge({ ...live, nowMs: Date.parse('2026-10-14T12:00:00.000Z') })).toBe(
      POLAR_TRIAL_DAY10_BUCKET,
    );
  });

  it('does not send before day 10 (5+ days remaining)', () => {
    expect(pickPolarTrialDay10Nudge({ ...live, nowMs: Date.parse('2026-10-10T00:00:00.000Z') })).toBeNull();
  });

  it('does not send after the trial instant has passed', () => {
    expect(pickPolarTrialDay10Nudge({ ...live, nowMs: Date.parse('2026-10-15T00:00:01.000Z') })).toBeNull();
  });

  it('does not send twice', () => {
    expect(pickPolarTrialDay10Nudge({ ...live, alreadySent: [POLAR_TRIAL_DAY10_BUCKET] })).toBeNull();
  });

  it('skips paid, grant, and non-pro rows', () => {
    expect(pickPolarTrialDay10Nudge({ ...live, status: 'active' })).toBeNull();
    expect(pickPolarTrialDay10Nudge({ ...live, source: 'admin_grant' })).toBeNull();
    expect(pickPolarTrialDay10Nudge({ ...live, tier: 'free' })).toBeNull();
  });

  it('skips a missing period end', () => {
    expect(pickPolarTrialDay10Nudge({ ...live, currentPeriodEnd: null })).toBeNull();
  });
});

describe('polarTrialUpgradeUrl', () => {
  it('points at the Polar checkout entry with a day-10 campaign', () => {
    expect(polarTrialUpgradeUrl('en')).toBe(
      'https://www.lexiclash.live/en/teacher/upgrade?utm_source=email&utm_campaign=polar_trial_day10',
    );
    expect(polarTrialUpgradeUrl('he')).toContain('/he/teacher/upgrade');
  });
});
