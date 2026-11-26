import { describe, it, expect, vi, beforeEach } from 'vitest';

const inserted: Array<{ user_id: string; event_type: string; payload: unknown }> = [];
vi.mock('@/lib/subscriptions', () => ({
  logSubscriptionEvent: vi.fn(async (row: (typeof inserted)[number]) => {
    inserted.push(row);
  }),
}));

let existingRows: Array<{ id: string }> = [];
let selectError: unknown = null;
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const result = Promise.resolve({ data: existingRows, error: selectError });
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'gte', 'limit']) {
        builder[m] = () => Object.assign(result, builder);
      }
      return builder;
    },
  }),
}));

import {
  recordTeacherTrialFunnelStep,
  TEACHER_TRIAL_FUNNEL_STEPS,
  TEACHER_TRIAL_STARTED_EVENT,
  TEACHER_TRIAL_ACTIVE_EVENT,
  TEACHER_TRIAL_EXPIRING_EVENT,
  TEACHER_TRIAL_EXPIRED_EVENT,
  TEACHER_TRIAL_PAYWALL_VIEWED_EVENT,
  TEACHER_SUBSCRIPTION_ACTIVE_EVENT,
} from '../teacherTrialFunnel';

describe('teacher trial funnel — durable steps', () => {
  beforeEach(() => {
    inserted.length = 0;
    existingRows = [];
    selectError = null;
  });

  it('lists the canonical steps in funnel order', () => {
    expect(TEACHER_TRIAL_FUNNEL_STEPS).toEqual([
      'teacher_trial_started',
      'teacher_trial_active',
      'teacher_trial_expiring',
      'teacher_trial_canceled',
      'teacher_trial_expired',
      'teacher_trial_paywall_viewed',
      'checkout_started',
      'teacher_subscription_active',
    ]);
  });

  it('writes a step with payload and never throws', async () => {
    await recordTeacherTrialFunnelStep({
      userId: 'u1',
      eventType: TEACHER_TRIAL_STARTED_EVENT,
      subscriptionId: 'sub_1',
      payload: { trial_end: '2026-11-01T00:00:00Z' },
    });
    expect(inserted).toEqual([
      {
        userId: 'u1',
        eventType: 'teacher_trial_started',
        subscriptionId: 'sub_1',
        payload: { trial_end: '2026-11-01T00:00:00Z' },
      },
    ]);
  });

  it("dedupe 'ever' writes the step only when no row exists yet", async () => {
    existingRows = [{ id: 'e1' }];
    await recordTeacherTrialFunnelStep({ userId: 'u1', eventType: TEACHER_TRIAL_ACTIVE_EVENT, dedupe: 'ever' });
    expect(inserted).toEqual([]);

    existingRows = [];
    await recordTeacherTrialFunnelStep({ userId: 'u1', eventType: TEACHER_TRIAL_ACTIVE_EVENT, dedupe: 'ever' });
    expect(inserted).toHaveLength(1);
  });

  it('a failed dedupe read fails open (writes anyway) and never throws', async () => {
    selectError = { message: 'db down' };
    await expect(
      recordTeacherTrialFunnelStep({ userId: 'u1', eventType: TEACHER_TRIAL_EXPIRING_EVENT, dedupe: { withinMs: 86_400_000 } }),
    ).resolves.toBeUndefined();
    expect(inserted).toHaveLength(1);
  });

  it('skips a blank user id instead of writing an orphan row', async () => {
    await recordTeacherTrialFunnelStep({ userId: '', eventType: TEACHER_TRIAL_EXPIRED_EVENT });
    expect(inserted).toEqual([]);
  });

  it('paywall and subscription steps use their canonical names', () => {
    expect(TEACHER_TRIAL_PAYWALL_VIEWED_EVENT).toBe('teacher_trial_paywall_viewed');
    expect(TEACHER_SUBSCRIPTION_ACTIVE_EVENT).toBe('teacher_subscription_active');
  });
});
