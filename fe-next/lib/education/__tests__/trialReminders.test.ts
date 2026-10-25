import { describe, it, expect } from 'vitest';
import { pickTrialReminder, MAX_DAYS_PAST_EXPIRY } from '../trialReminders';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-25T09:00:00.000Z');
const expiryIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('pickTrialReminder', () => {
  it('says nothing while the trial is young', () => {
    expect(pickTrialReminder(expiryIn(10), [], NOW)).toBeNull();
  });

  it('warns 3 days out, then on the day, then after', () => {
    expect(pickTrialReminder(expiryIn(3), [], NOW)).toBe('t-3');
    expect(pickTrialReminder(expiryIn(0.5), ['t-3'], NOW)).toBe('t-0');
    expect(pickTrialReminder(expiryIn(-3), ['t-3', 't-0'], NOW)).toBe('t+3');
  });

  // Oct 2026: a 3-day cron outage left six teachers whose trials had ended 2-3
  // days earlier owed "t-0". Whoever calls the route next must not tell them
  // their trial "ends today".
  it('never sends "ends today" once the trial has ended', () => {
    expect(pickTrialReminder(expiryIn(0), ['t-3'], NOW)).toBeNull();
    expect(pickTrialReminder(expiryIn(-0.1), ['t-3'], NOW)).toBeNull();
    expect(pickTrialReminder(expiryIn(-2), ['t-3'], NOW)).toBeNull();
    expect(pickTrialReminder(expiryIn(-2.9), [], NOW)).toBeNull();
  });

  it('waits for the post-expiry email instead, and sends it on day 3', () => {
    expect(pickTrialReminder(expiryIn(-3), ['t-3'], NOW)).toBe('t+3');
  });

  it('sends "ends today" only in the final day of a running trial', () => {
    expect(pickTrialReminder(expiryIn(1.5), ['t-3'], NOW)).toBeNull();
    expect(pickTrialReminder(expiryIn(1), ['t-3'], NOW)).toBe('t-0');
    expect(pickTrialReminder(expiryIn(0.01), [], NOW)).toBe('t-0');
  });

  it('never repeats a bucket', () => {
    expect(pickTrialReminder(expiryIn(3), ['t-3'], NOW)).toBeNull();
    expect(pickTrialReminder(expiryIn(-3), ['t-3', 't-0', 't+3'], NOW)).toBeNull();
  });

  // The 8 teachers whose trials lapsed during the outage were never emailed
  // anything. A same-day-only match would skip them forever; the threshold
  // form asks them once, with the post-expiry copy.
  it('catches up a trial that lapsed before this code existed', () => {
    expect(pickTrialReminder(expiryIn(-20), [], NOW)).toBe('t+3');
  });

  // ...but does not send an earlier, now-false message afterwards.
  it('does not fall back to an older bucket once the latest one went out', () => {
    expect(pickTrialReminder(expiryIn(-20), ['t+3'], NOW)).toBeNull();
  });

  it('leaves cold rows alone', () => {
    expect(pickTrialReminder(expiryIn(-(MAX_DAYS_PAST_EXPIRY + 1)), [], NOW)).toBeNull();
  });

  it('ignores a missing or unparseable expiry', () => {
    expect(pickTrialReminder(null, [], NOW)).toBeNull();
    expect(pickTrialReminder('not a date', [], NOW)).toBeNull();
  });
});
