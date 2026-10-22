import { describe, it, expect } from 'vitest';
import {
  ABANDONED_CHECKOUT_EMAIL_EVENT,
  CHECKOUT_STARTED_EVENT,
  abandonedCheckoutUpgradeUrl,
  checkoutStartedPayload,
  planAbandonedCheckouts,
} from '../abandonedCheckout';

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-23T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();

const start = (over: Partial<{ id: string; user_id: string; created_at: string; payload: unknown }> = {}) => ({
  id: 'ev1',
  user_id: 'u1',
  created_at: hoursAgo(3),
  payload: { mode: 'paid', locale: 'en' },
  ...over,
});

const none = { proUserIds: new Set<string>(), testUserIds: new Set<string>(), nowMs: NOW };

describe('checkoutStartedPayload', () => {
  it('never carries a `trial` key or a trial event name, so a started-but-abandoned trial is not read as a used trial', () => {
    const p = checkoutStartedPayload({ trial: true, locale: 'he' });
    expect(p).toEqual({ mode: 'trial', locale: 'he' });
    expect(p).not.toHaveProperty('trial');
    expect(CHECKOUT_STARTED_EVENT).not.toMatch(/trial/);
    expect(ABANDONED_CHECKOUT_EMAIL_EVENT).not.toMatch(/trial/);
    expect(checkoutStartedPayload({ trial: false, locale: 'en' })).toEqual({ mode: 'paid', locale: 'en' });
  });
});

describe('abandonedCheckoutUpgradeUrl', () => {
  it('links to the upgrade page, which starts a fresh checkout', () => {
    expect(abandonedCheckoutUpgradeUrl('he')).toBe(
      'https://www.lexiclash.live/he/teacher/upgrade?utm_source=email&utm_campaign=abandoned_checkout',
    );
  });
});

describe('planAbandonedCheckouts', () => {
  it('is due between 1 and 24 hours after the start', () => {
    expect(planAbandonedCheckouts({ ...none, started: [start({ created_at: hoursAgo(0.9) })], userEvents: [] }).due).toEqual([]);
    expect(planAbandonedCheckouts({ ...none, started: [start({ created_at: hoursAgo(25) })], userEvents: [] }).due).toEqual([]);
    const plan = planAbandonedCheckouts({ ...none, started: [start()], userEvents: [] });
    expect(plan.due).toEqual([{ userId: 'u1', checkoutEventId: 'ev1', startedAt: hoursAgo(3), mode: 'paid', locale: 'en' }]);
  });

  it('judges only the latest start, so someone mid-checkout right now is left alone', () => {
    const plan = planAbandonedCheckouts({
      ...none,
      started: [start({ id: 'old', created_at: hoursAgo(5) }), start({ id: 'new', created_at: hoursAgo(0.2) })],
      userEvents: [],
    });
    expect(plan.due).toEqual([]);
    expect(plan.skipped.tooRecent).toBe(1);
  });

  it('skips a checkout that completed after it started', () => {
    for (const event_type of ['order.paid', 'checkout.completed', 'subscription.active', 'subscription.created']) {
      const plan = planAbandonedCheckouts({
        ...none,
        started: [start()],
        userEvents: [{ user_id: 'u1', event_type, created_at: hoursAgo(2) }],
      });
      expect(plan.due).toEqual([]);
      expect(plan.skipped.completed).toBe(1);
    }
  });

  it('ignores completions older than the start', () => {
    const plan = planAbandonedCheckouts({
      ...none,
      started: [start()],
      userEvents: [{ user_id: 'u1', event_type: 'subscription.active', created_at: hoursAgo(400) }],
    });
    expect(plan.due).toHaveLength(1);
  });

  it('sends at most one abandoned-checkout email per teacher, ever', () => {
    const plan = planAbandonedCheckouts({
      ...none,
      started: [start()],
      userEvents: [{ user_id: 'u1', event_type: ABANDONED_CHECKOUT_EMAIL_EVENT, created_at: hoursAgo(24 * 40) }],
    });
    expect(plan.due).toEqual([]);
    expect(plan.skipped.alreadySent).toBe(1);
  });

  it('skips Pro teachers and test accounts', () => {
    expect(
      planAbandonedCheckouts({ ...none, proUserIds: new Set(['u1']), started: [start()], userEvents: [] }).skipped.pro,
    ).toBe(1);
    expect(
      planAbandonedCheckouts({ ...none, testUserIds: new Set(['u1']), started: [start()], userEvents: [] }).skipped.test,
    ).toBe(1);
  });

  it('tolerates a malformed payload', () => {
    const plan = planAbandonedCheckouts({ ...none, started: [start({ payload: null })], userEvents: [] });
    expect(plan.due[0]).toMatchObject({ mode: 'paid', locale: null });
  });
});
