import { describe, it, expect } from 'vitest';
import {
  polarTrialPlan,
  showProCardAsk,
  trialCardAskTiming,
  TRIAL_CARD_ASK_LAST_DAYS,
} from '../accessTrialCheckout';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-25T10:00:00.000Z');
const endsIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('polarTrialPlan', () => {
  it('no access window: the standard 14-day trial', () => {
    expect(polarTrialPlan(null, NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan(undefined, NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan('not a date', NOW)).toEqual({ days: 14, source: 'standard' });
  });

  it('an access window that already ended: no second trial (days 0)', () => {
    expect(polarTrialPlan(endsIn(-1), NOW)).toEqual({ days: 0, source: 'access_trial_ended' });
    expect(polarTrialPlan(endsIn(0), NOW)).toEqual({ days: 0, source: 'access_trial_ended' });
    expect(polarTrialPlan(endsIn(-60), NOW)).toEqual({ days: 0, source: 'access_trial_ended' });
  });

  it('never had a window, or it is unknown: the standard 14-day trial', () => {
    expect(polarTrialPlan(null, NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan(undefined, NOW)).toEqual({ days: 14, source: 'standard' });
    expect(polarTrialPlan('not-a-date', NOW)).toEqual({ days: 14, source: 'standard' });
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

describe('card-ask timing (measured drop-off fix)', () => {
  it('suppresses the ask while the free window has more than the last days left', () => {
    expect(trialCardAskTiming(endsIn(60), NOW)).toBe('too_early');
    expect(trialCardAskTiming(endsIn(TRIAL_CARD_ASK_LAST_DAYS + 0.5), NOW)).toBe('too_early');
    expect(showProCardAsk('too_early')).toBe(false);
  });

  it('opens the ask in the last days of the window, when it ends, and when there is none', () => {
    expect(trialCardAskTiming(endsIn(TRIAL_CARD_ASK_LAST_DAYS), NOW)).toBe('ending_soon');
    expect(trialCardAskTiming(endsIn(0.2), NOW)).toBe('ending_soon');
    expect(trialCardAskTiming(endsIn(-1), NOW)).toBe('access_ended');
    expect(trialCardAskTiming(null, NOW)).toBe('no_access_window');
    expect(trialCardAskTiming(undefined, NOW)).toBe('no_access_window');
    expect(trialCardAskTiming('junk', NOW)).toBe('no_access_window');
    expect(showProCardAsk('ending_soon')).toBe(true);
    expect(showProCardAsk('access_ended')).toBe(true);
    expect(showProCardAsk('no_access_window')).toBe(true);
  });

  it('is stable: a teacher deep in the window never sees the ask early', () => {
    expect(showProCardAsk(trialCardAskTiming(endsIn(90), NOW))).toBe(false);
  });
});
