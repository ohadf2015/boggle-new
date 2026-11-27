import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
const checkTeacherSubscription = vi.fn();
const setTrialEnd = vi.fn();
const selectSingle = vi.fn();
const isNativeAppUserAgent = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ setTrialEnd }) }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: selectSingle }) }),
    }),
  }),
}));
vi.mock('@/lib/native/nativeHandoff', () => ({ isNativeAppUserAgent: (...a: unknown[]) => isNativeAppUserAgent(...a) }));
const captureProFunnelServerEvent = vi.fn();
vi.mock('@/lib/education/proFunnelServer', async (orig) => ({
  ...(await orig<object>()),
  captureProFunnelServerEvent: (...a: unknown[]) => captureProFunnelServerEvent(...a),
}));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { POST } from '../route';
import { addMonthsUtc } from '@/lib/education/teacherCancelRetention';

const req = (body: unknown) =>
  new NextRequest('https://www.lexiclash.live/api/subscription/retention-offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const trialing = { has_pro: true, status: 'trialing', source: 'polar', cancel_at_period_end: false };
const active = { ...trialing, status: 'active' };

describe('POST /api/subscription/retention-offer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativeAppUserAgent.mockReturnValue(false);
    getAuthedUser.mockResolvedValue({ id: 'u1' });
    checkTeacherSubscription.mockResolvedValue(trialing);
    selectSingle.mockResolvedValue({
      data: { lemon_squeezy_subscription_id: 'sub_1', status: 'trialing', current_period_end: '2026-12-06T00:00:00.000Z' },
      error: null,
    });
    setTrialEnd.mockResolvedValue(undefined);
  });

  it('pause on a trial moves the Polar trial end out one month, on the same subscription', async () => {
    const res = await POST(req({ offer: 'pause' }));
    expect(res.status).toBe(200);
    expect(setTrialEnd).toHaveBeenCalledTimes(1);
    expect(setTrialEnd).toHaveBeenCalledWith('sub_1', '2027-01-06T00:00:00.000Z');
    const body = await res.json();
    expect(body).toEqual({ ok: true, applied: 'pause', trial_end: '2027-01-06T00:00:00.000Z' });
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'teacher_pro_retention_offer_applied',
        distinctId: 'u1',
        properties: expect.objectContaining({ offer: 'pause', status: 'trialing', applied: 'pause' }),
      }),
    );
  });

  it('clamps the one-month shift at a short month (Jan 31 → Feb 28)', () => {
    expect(addMonthsUtc('2027-01-31T12:00:00.000Z', 1)).toBe('2027-02-28T12:00:00.000Z');
  });

  it('discount is recorded, not charged: no Polar write, durable event only', async () => {
    const res = await POST(req({ offer: 'discount' }));
    expect(res.status).toBe(200);
    expect(setTrialEnd).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ ok: true, applied: 'recorded' });
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'teacher_pro_retention_offer_applied',
        properties: expect.objectContaining({ offer: 'discount', applied: 'recorded' }),
      }),
    );
  });

  it('pause on an active plan has no live pause yet: recorded only', async () => {
    checkTeacherSubscription.mockResolvedValue(active);
    selectSingle.mockResolvedValue({
      data: { lemon_squeezy_subscription_id: 'sub_1', status: 'active', current_period_end: '2026-12-01T00:00:00.000Z' },
      error: null,
    });
    const res = await POST(req({ offer: 'pause' }));
    expect(res.status).toBe(200);
    expect(setTrialEnd).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ ok: true, applied: 'recorded' });
  });

  it('falls back to now+1 month when the row has no period end', async () => {
    selectSingle.mockResolvedValue({ data: { lemon_squeezy_subscription_id: 'sub_1', status: 'trialing', current_period_end: null }, error: null });
    const before = Date.now();
    const res = await POST(req({ offer: 'pause' }));
    expect(res.status).toBe(200);
    const [, trialEnd] = setTrialEnd.mock.calls[0] as [string, string];
    expect(Date.parse(trialEnd)).toBeGreaterThan(before + 28 * 86_400_000);
  });

  it('refuses a signed-out request', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await POST(req({ offer: 'pause' }))).status).toBe(401);
    expect(setTrialEnd).not.toHaveBeenCalled();
  });

  it('refuses the native app', async () => {
    isNativeAppUserAgent.mockReturnValue(true);
    expect((await POST(req({ offer: 'pause' }))).status).toBe(403);
    expect(setTrialEnd).not.toHaveBeenCalled();
  });

  it('refuses a bad offer shape', async () => {
    expect((await POST(req({ offer: 'free_year' }))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect(setTrialEnd).not.toHaveBeenCalled();
  });

  it('refuses when there is no live Polar Pro subscription to attach the offer to', async () => {
    for (const sub of [
      { ...trialing, has_pro: false, status: 'canceled' },
      { ...trialing, source: 'admin_grant' },
      { ...trialing, status: 'past_due' },
    ]) {
      checkTeacherSubscription.mockResolvedValue(sub);
      expect((await POST(req({ offer: 'pause' }))).status).toBe(409);
    }
    expect(setTrialEnd).not.toHaveBeenCalled();
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
  });

  it('reports a Polar failure as an error and fires no acceptance event', async () => {
    setTrialEnd.mockRejectedValue(new Error('polar down'));
    expect((await POST(req({ offer: 'pause' }))).status).toBe(502);
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
  });
});
