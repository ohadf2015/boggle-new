import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
const checkTeacherSubscription = vi.fn();
const updateSelect = vi.fn();
const isNativeAppUserAgent = vi.fn();
const isQaEmail = vi.fn();
const isAnyTestAccount = vi.fn();
const captureProFunnelServerEvent = vi.fn();
const recordTeacherTrialFunnelStep = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => ({
          is: () => ({
            select: updateSelect,
          }),
        }),
      }),
    }),
  }),
}));
vi.mock('@/lib/native/nativeHandoff', () => ({ isNativeAppUserAgent: (...a: unknown[]) => isNativeAppUserAgent(...a) }));
vi.mock('@/backend/utils/educationRoundTelemetry', () => ({ isQaEmail: (...a: unknown[]) => isQaEmail(...a) }));
vi.mock('@/lib/education/eduTestAccount', () => ({ isAnyTestAccount: (...a: unknown[]) => isAnyTestAccount(...a) }));
vi.mock('@/lib/education/proFunnelServer', () => ({
  buildTrialCancelReasonSelectedEvent: (userId: string, args: unknown) => ({ event: 'trial_cancel_reason_selected', distinctId: userId, args }),
  captureProFunnelServerEvent: (...a: unknown[]) => captureProFunnelServerEvent(...a),
}));
vi.mock('@/lib/education/teacherTrialFunnel', () => ({
  TEACHER_TRIAL_CANCEL_REASON_SELECTED_EVENT: 'trial_cancel_reason_selected',
  recordTeacherTrialFunnelStep: (...a: unknown[]) => recordTeacherTrialFunnelStep(...a),
}));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { POST } from '../route';
import { isCancelReason } from '@/lib/education/teacherCancelRetention';

const req = (body: unknown) =>
  new NextRequest('https://www.lexiclash.live/api/subscription/cancel-reason', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const cancelledTrial = {
  has_pro: true,
  status: 'trialing',
  source: 'polar',
  cancel_at_period_end: true,
  cancel_reason: null,
};

describe('POST /api/subscription/cancel-reason', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativeAppUserAgent.mockReturnValue(false);
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.de' });
    checkTeacherSubscription.mockResolvedValue(cancelledTrial);
    updateSelect.mockResolvedValue({ data: [{ lemon_squeezy_subscription_id: 'sub_1' }], error: null });
    isQaEmail.mockReturnValue(false);
    isAnyTestAccount.mockResolvedValue(false);
  });

  it('stores the chip reason and fires trial_cancel_reason_selected once', async () => {
    const res = await POST(req({ reason: 'too_expensive' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, recorded: true });
    expect(captureProFunnelServerEvent).toHaveBeenCalledTimes(1);
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'trial_cancel_reason_selected', distinctId: 'u1' }),
    );
    expect(recordTeacherTrialFunnelStep).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        eventType: 'trial_cancel_reason_selected',
        subscriptionId: 'sub_1',
        payload: { reason: 'too_expensive', reason_source: 'chip' },
      }),
    );
  });

  it('accepts every chip reason and rejects anything else', () => {
    for (const reason of ['too_expensive', 'school_pays', 'just_testing', 'missing_feature']) {
      expect(isCancelReason(reason)).toBe(true);
    }
    expect(isCancelReason('other')).toBe(false);
    expect(isCancelReason(undefined)).toBe(false);
  });

  it('a second tap is a no-op: empty write fires no event', async () => {
    updateSelect.mockResolvedValue({ data: [], error: null });
    const res = await POST(req({ reason: 'just_testing' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, recorded: false });
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
    expect(recordTeacherTrialFunnelStep).not.toHaveBeenCalled();
  });

  it('skips the event for a QA email but still stores the answer', async () => {
    isQaEmail.mockReturnValue(true);
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'qa@lexiclash.test' });
    const res = await POST(req({ reason: 'school_pays' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, recorded: true });
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
    expect(recordTeacherTrialFunnelStep).not.toHaveBeenCalled();
  });

  it('skips the event for an is_test_account profile', async () => {
    isAnyTestAccount.mockResolvedValue(true);
    const res = await POST(req({ reason: 'missing_feature' }));
    expect(res.status).toBe(200);
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
    expect(recordTeacherTrialFunnelStep).not.toHaveBeenCalled();
  });

  it('refuses a signed-out request', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await POST(req({ reason: 'too_expensive' }))).status).toBe(401);
    expect(updateSelect).not.toHaveBeenCalled();
  });

  it('refuses the native app', async () => {
    isNativeAppUserAgent.mockReturnValue(true);
    expect((await POST(req({ reason: 'too_expensive' }))).status).toBe(403);
    expect(updateSelect).not.toHaveBeenCalled();
  });

  it('refuses a bad reason shape', async () => {
    expect((await POST(req({ reason: 'free_year' }))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect(updateSelect).not.toHaveBeenCalled();
  });

  it('refuses when the teacher has no cancelled Pro subscription', async () => {
    for (const sub of [
      { ...cancelledTrial, has_pro: false, status: 'canceled' },
      { ...cancelledTrial, source: 'admin_grant' },
      { ...cancelledTrial, cancel_at_period_end: false },
    ]) {
      checkTeacherSubscription.mockResolvedValue(sub);
      expect((await POST(req({ reason: 'too_expensive' }))).status).toBe(409);
    }
    expect(updateSelect).not.toHaveBeenCalled();
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
  });

  it('reports a failed write as an error and fires no event', async () => {
    updateSelect.mockResolvedValue({ data: null, error: { message: 'db down' } });
    expect((await POST(req({ reason: 'too_expensive' }))).status).toBe(503);
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
    expect(recordTeacherTrialFunnelStep).not.toHaveBeenCalled();
  });
});
