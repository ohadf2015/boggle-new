import { describe, it, expect } from 'vitest';
import { noticesStillCounted, planPolarTrialFirstGameRestart, type PolarTrialSubRow } from '../polarTrialFirstGame';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const FOURTEEN = '2026-11-30T12:00:00.000Z';
const sub = (over: Partial<PolarTrialSubRow> = {}): PolarTrialSubRow => ({
  tier: 'pro',
  status: 'trialing',
  source: 'polar',
  current_period_end: '2026-11-20T00:00:00Z',
  cancel_at_period_end: false,
  lemon_squeezy_subscription_id: 'sub_1',
  ...over,
});

describe('planPolarTrialFirstGameRestart: the card trial restarts at the first class game', () => {
  it('moves the trial end to 14 days from the first game', () => {
    expect(planPolarTrialFirstGameRestart(sub(), NOW, false)).toEqual({ subscriptionId: 'sub_1', trialEnd: FOURTEEN });
  });
  it('once only', () => {
    expect(planPolarTrialFirstGameRestart(sub(), NOW, true)).toBeNull();
  });
  it('never touches a paying, cancelled, granted or id-less subscription', () => {
    expect(planPolarTrialFirstGameRestart(sub({ status: 'active' }), NOW, false)).toBeNull();
    expect(planPolarTrialFirstGameRestart(sub({ status: 'past_due' }), NOW, false)).toBeNull();
    expect(planPolarTrialFirstGameRestart(sub({ cancel_at_period_end: true }), NOW, false)).toBeNull();
    expect(planPolarTrialFirstGameRestart(sub({ source: 'admin_grant' }), NOW, false)).toBeNull();
    expect(planPolarTrialFirstGameRestart(sub({ lemon_squeezy_subscription_id: null }), NOW, false)).toBeNull();
  });
  it('never shortens a trial that already runs longer (no stacking either way)', () => {
    expect(planPolarTrialFirstGameRestart(sub({ current_period_end: '2026-12-15T00:00:00Z' }), NOW, false)).toBeNull();
  });
});

describe('noticesStillCounted: a restarted trial is owed its day-before notice again', () => {
  it('drops notices sent before the restart and keeps later ones', () => {
    const rows = [
      { user_id: 'u1', event_type: 'polar_trial_day_before_sent', created_at: '2026-11-10T00:00:00Z' },
      { user_id: 'u1', event_type: 'polar_trial_day10_sent', created_at: '2026-11-20T00:00:00Z' },
      { user_id: 'u2', event_type: 'polar_trial_day_before_sent', created_at: '2026-11-10T00:00:00Z' },
    ];
    const kept = noticesStillCounted(rows, new Map([['u1', '2026-11-15T00:00:00Z']]));
    expect(kept.map((r) => `${r.user_id}:${r.event_type}`)).toEqual(['u1:polar_trial_day10_sent', 'u2:polar_trial_day_before_sent']);
  });
});
