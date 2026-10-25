import { describe, it, expect } from 'vitest';
import { polarTrialPlan } from '../accessTrialCheckout';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-25T10:00:00.000Z');
const endsIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('polarTrialPlan', () => {
  it('no access window: the standard 14-day trial', () => {
    expect(polarTrialPlan(null, NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan(undefined, NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan('not a date', NOW)).toEqual({ days: 14, source: 'standard' });
  });

  it('an access window that already ended: the standard trial', () => {
    expect(polarTrialPlan(endsIn(-1), NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan(endsIn(0), NOW)).toEqual({ days: 14, source: 'standard' });
  });

  it('inside the access window: only the days left, rounded up', () => {
    expect(polarTrialPlan(endsIn(13.9), NOW)).toEqual({ days: 14, source: 'access_trial' });
    expect(polarTrialPlan(endsIn(7), NOW)).toEqual({ days: 7, source: 'access_trial' });
    expect(polarTrialPlan(endsIn(3.2), NOW)).toEqual({ days: 4, source: 'access_trial' });
    expect(polarTrialPlan(endsIn(0.1), NOW)).toEqual({ days: 1, source: 'access_trial' });
  });

  it('never hands out more than the standard length', () => {
    expect(polarTrialPlan(endsIn(40), NOW)).toEqual({ days: 14, source: 'access_trial' });
  });
});
