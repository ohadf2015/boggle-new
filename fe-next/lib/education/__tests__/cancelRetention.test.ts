import { describe, expect, it } from 'vitest';
import {
  addOneUtcMonth,
  findRetainDiscount,
  planPause,
  retainDiscountCreateBody,
  subscriptionOwnedBy,
  type PolarSubscriptionSnapshot,
} from '../cancelRetention';

const NOW = Date.parse('2026-11-23T07:45:00.000Z');

function sub(over: Partial<PolarSubscriptionSnapshot> = {}): PolarSubscriptionSnapshot {
  return {
    id: 'sub_1',
    status: 'trialing',
    trialEnd: '2026-12-06T07:45:00.000Z',
    currentPeriodEnd: '2026-12-06T07:45:00.000Z',
    cancelAtPeriodEnd: false,
    pauseAtPeriodEnd: false,
    discountId: null,
    metadata: { user_id: 'teacher_1', trial: true },
    externalCustomerId: 'teacher_1',
    metaUserId: 'teacher_1',
    ...over,
  };
}

describe('Teacher Pro pre-cancel retention plan', () => {
  it('adds one calendar month and clamps a month-end overflow', () => {
    expect(addOneUtcMonth(Date.parse('2026-01-31T00:00:00.000Z'))).toBe('2026-02-28T00:00:00.000Z');
    expect(addOneUtcMonth(Date.parse('2026-11-23T07:45:00.000Z'))).toBe('2026-12-23T07:45:00.000Z');
  });

  it('a trialing teacher cannot be Polar-paused, so pause pushes the first charge back a month', () => {
    const plan = planPause(sub(), NOW);
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.already || plan.mechanism !== 'trial_extend') throw new Error('expected a trial extension');
    expect(plan.trialEnd).toBe('2027-01-06T07:45:00.000Z');
    expect(plan.body.trial_end).toBe(plan.trialEnd);
    expect(plan.body.metadata.user_id).toBe('teacher_1');
    expect(plan.body.metadata.retain_offer).toBe('pause');
    expect(plan.body).not.toHaveProperty('pause_at_period_end');
  });

  it('does not extend the trial a second time when this pause is already scheduled', () => {
    const plan = planPause(
      sub({ metadata: { user_id: 'teacher_1', retain_offer: 'pause', retain_pause_until: '2027-01-06T07:45:00.000Z' } }),
      NOW,
    );
    expect(plan).toEqual({ ok: true, already: true, mechanism: 'trial_extend' });
  });

  it('pauses a paying subscription at period end and resumes one month later', () => {
    const plan = planPause(sub({ status: 'active', trialEnd: null }), NOW);
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.already || plan.mechanism !== 'pause_at_period_end') throw new Error('expected a period-end pause');
    expect(plan.body).toEqual({
      pause_at_period_end: true,
      resumes_at: '2027-01-06T07:45:00.000Z',
    });
  });

  it('treats an already-scheduled pause as done, and refuses a cancel or a non-active row', () => {
    expect(planPause(sub({ status: 'active', trialEnd: null, pauseAtPeriodEnd: true }), NOW)).toEqual({
      ok: true,
      already: true,
      mechanism: 'pause_at_period_end',
    });
    expect(planPause(sub({ cancelAtPeriodEnd: true }), NOW)).toEqual({ ok: false, reason: 'canceled' });
    expect(planPause(sub({ status: 'past_due', trialEnd: null }), NOW)).toEqual({ ok: false, reason: 'not_pausable' });
    expect(planPause(sub({ status: 'active', trialEnd: null, currentPeriodEnd: null }), NOW)).toEqual({
      ok: false,
      reason: 'not_pausable',
    });
  });

  it('refuses a Polar subscription that belongs to a different teacher', () => {
    expect(subscriptionOwnedBy(sub(), 'teacher_1')).toBe(true);
    expect(subscriptionOwnedBy(sub({ externalCustomerId: 'other' }), 'teacher_1')).toBe(false);
    expect(subscriptionOwnedBy(sub({ metaUserId: 'other', externalCustomerId: null }), 'teacher_1')).toBe(false);
  });

  it('builds a 50% repeating discount locked to Teacher Pro, with no public checkout code', () => {
    expect(retainDiscountCreateBody('prod_1')).toMatchObject({
      type: 'percentage',
      duration: 'repeating',
      duration_in_months: 3,
      basis_points: 5000,
      max_redemptions_per_customer: 1,
      products: ['prod_1'],
      metadata: { purpose: 'teacher_pro_retain_50_3mo' },
    });
    expect(retainDiscountCreateBody('prod_1')).not.toHaveProperty('code');
    expect(retainDiscountCreateBody(null)).not.toHaveProperty('products');
  });

  it('finds the shared retain discount by code or purpose, ignoring a lookalike', () => {
    expect(
      findRetainDiscount([
        { id: 'not-a-uuid', code: 'TEACHERPROKEEP50' },
        { id: '11111111-1111-4111-8111-111111111111', code: 'OTHER' },
        { id: '22222222-2222-4222-8222-222222222222', metadata: { purpose: 'teacher_pro_retain_50_3mo' } },
      ]),
    ).toBe('22222222-2222-4222-8222-222222222222');
  });
});
