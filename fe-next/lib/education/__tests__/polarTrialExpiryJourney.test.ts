import { describe, it, expect } from 'vitest';
import {
  MAX_DAYS_PAST_POLAR_EXPIRY,
  isPolarTrialExpiryConversion,
  pickPolarTrialExpiryJourney,
  polarTrialExpiryUpgradeUrl,
} from '../polarTrialExpiryJourney';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-15T09:00:00.000Z');
const endIn = (days: number) => new Date(NOW + days * DAY).toISOString();

const live = {
  tier: 'pro',
  status: 'trialing',
  source: 'polar' as string | null,
  currentPeriodEnd: endIn(0),
  trialUsed: true,
  alreadySent: [] as string[],
  nowMs: NOW,
};

describe('pickPolarTrialExpiryJourney', () => {
  it('sends t-0 once the Polar trial instant has been reached', () => {
    expect(pickPolarTrialExpiryJourney(live)).toBe('t-0');
  });

  it('does not steal day-10 (still days left)', () => {
    expect(pickPolarTrialExpiryJourney({ ...live, currentPeriodEnd: endIn(4) })).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...live, currentPeriodEnd: endIn(1) })).toBeNull();
  });

  it('sends t+3 three days after lapse, and catch-up uses t+3 not a stale t-0', () => {
    const lapsed = {
      ...live,
      status: 'canceled',
      currentPeriodEnd: endIn(-3),
    };
    expect(pickPolarTrialExpiryJourney(lapsed)).toBe('t+3');
    expect(pickPolarTrialExpiryJourney({ ...lapsed, alreadySent: ['t-0'] })).toBe('t+3');
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-10), alreadySent: [] })).toBe(
      't+3',
    );
  });

  it('never repeats a bucket and does not fall back after the latest went out', () => {
    expect(pickPolarTrialExpiryJourney({ ...live, alreadySent: ['t-0'] })).toBeNull();
    expect(
      pickPolarTrialExpiryJourney({
        ...live,
        status: 'canceled',
        currentPeriodEnd: endIn(-10),
        alreadySent: ['t+3'],
      }),
    ).toBeNull();
  });

  it('sends the t+14 and t+30 win-back once each, latest due bucket only', () => {
    const lapsed = { ...live, status: 'canceled', alreadySent: ['t-0', 't+3'] };
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-13.9) })).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-14) })).toBe('t+14');
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-20), alreadySent: ['t+14'] })).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-30) })).toBe('t+30');
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-45), alreadySent: ['t+30'] })).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...lapsed, currentPeriodEnd: endIn(-30), alreadySent: [] })).toBe('t+30');
  });

  it('never sends a win-back to a row still marked trialing, which counts as Pro', () => {
    expect(pickPolarTrialExpiryJourney({ ...live, status: 'trialing', currentPeriodEnd: endIn(-14) })).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...live, status: 'trialing', currentPeriodEnd: endIn(-30) })).toBeNull();
  });

  it('leaves cold rows alone', () => {
    expect(
      pickPolarTrialExpiryJourney({
        ...live,
        status: 'canceled',
        currentPeriodEnd: endIn(-(MAX_DAYS_PAST_POLAR_EXPIRY + 1)),
      }),
    ).toBeNull();
  });

  it('skips paid-active, grants, never-trialed, and missing dates', () => {
    expect(pickPolarTrialExpiryJourney({ ...live, status: 'active', trialUsed: true })).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...live, source: 'admin_grant' })).toBeNull();
    expect(
      pickPolarTrialExpiryJourney({
        ...live,
        status: 'canceled',
        trialUsed: false,
        currentPeriodEnd: endIn(-5),
      }),
    ).toBeNull();
    expect(pickPolarTrialExpiryJourney({ ...live, currentPeriodEnd: null })).toBeNull();
  });
});

describe('polarTrialExpiryUpgradeUrl', () => {
  it('tags the Polar checkout entry with the bucket campaign', () => {
    expect(polarTrialExpiryUpgradeUrl('en', 't-0')).toBe(
      'https://www.lexiclash.live/en/teacher/upgrade?utm_source=email&utm_campaign=polar_trial_t0',
    );
    expect(polarTrialExpiryUpgradeUrl('he', 't+3')).toContain('/he/teacher/upgrade');
    expect(polarTrialExpiryUpgradeUrl('he', 't+3')).toContain('polar_trial_t3');
    expect(polarTrialExpiryUpgradeUrl('en', 't+14')).toContain('utm_campaign=polar_trial_t14');
    expect(polarTrialExpiryUpgradeUrl('en', 't+30')).toContain('utm_campaign=polar_trial_t30');
  });
});

describe('isPolarTrialExpiryConversion', () => {
  it('is the digest lapse CTA: free again after a Polar trial', () => {
    expect(isPolarTrialExpiryConversion(false, true)).toBe(true);
    expect(isPolarTrialExpiryConversion(true, true)).toBe(false);
    expect(isPolarTrialExpiryConversion(false, false)).toBe(false);
  });
});
