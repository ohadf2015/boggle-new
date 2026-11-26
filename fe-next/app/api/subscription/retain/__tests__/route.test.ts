import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
const checkTeacherSubscription = vi.fn();
const getSubscription = vi.fn();
const updateSubscription = vi.fn();
const listDiscounts = vi.fn();
const createDiscount = vi.fn();
const selectSingle = vi.fn();
const updateEq = vi.fn();
const captureProFunnelServerEvent = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ getSubscription, updateSubscription, listDiscounts, createDiscount }),
  getProProductId: () => 'prod_pro',
  PolarApiError: class PolarApiError extends Error {
    status: number;
    constructor(status: number, body: string) {
      super(`Polar API error: ${status} ${body}`);
      this.status = status;
    }
  },
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: selectSingle }) }),
      update: (row: unknown) => ({ eq: (...a: unknown[]) => updateEq(row, ...a) }),
    }),
  }),
}));
vi.mock('@/lib/education/proFunnelServer', async (orig) => ({
  ...(await orig<object>()),
  captureProFunnelServerEvent: (...a: unknown[]) => captureProFunnelServerEvent(...a),
}));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { POST } from '../route';

const DISCOUNT = '33333333-3333-4333-8333-333333333333';
const trialPolar = {
  id: 'sub_1',
  status: 'trialing',
  trial_end: '2026-12-06T07:45:00.000Z',
  current_period_end: '2026-12-06T07:45:00.000Z',
  cancel_at_period_end: false,
  metadata: { user_id: 'u1', trial: true },
  customer: { external_id: 'u1' },
};
const liveTrial = { has_pro: true, status: 'trialing', source: 'polar', cancel_at_period_end: false };

function req(offer: string) {
  return new NextRequest('https://www.lexiclash.live/api/subscription/retain', {
    method: 'POST',
    body: JSON.stringify({ offer }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/subscription/retain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.POLAR_RETAIN_DISCOUNT_ID;
    getAuthedUser.mockResolvedValue({ id: 'u1' });
    checkTeacherSubscription.mockResolvedValue(liveTrial);
    selectSingle.mockResolvedValue({ data: { lemon_squeezy_subscription_id: 'sub_1' }, error: null });
    getSubscription.mockResolvedValue(trialPolar);
    updateSubscription.mockResolvedValue({});
    updateEq.mockResolvedValue({ error: null });
    listDiscounts.mockResolvedValue({ items: [] });
    createDiscount.mockResolvedValue({ id: DISCOUNT });
  });

  it('extends a live trial by a month instead of opening a second checkout', async () => {
    const res = await POST(req('pause'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, offer: 'pause', mechanism: 'trial_extend', already: false });
    expect(updateSubscription).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({
        trial_end: expect.any(String),
        metadata: expect.objectContaining({ user_id: 'u1', retain_offer: 'pause' }),
      }),
    );
    const patch = updateSubscription.mock.calls[0][1] as { trial_end: string };
    expect(Date.parse(patch.trial_end)).toBeGreaterThan(Date.parse('2026-12-06T07:45:00.000Z'));
    expect(updateEq).toHaveBeenCalledWith({ current_period_end: patch.trial_end }, 'user_id', 'u1');
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'teacher_cancel_offer_applied', distinctId: 'u1' }),
    );
    expect(createDiscount).not.toHaveBeenCalled();
  });

  it('pauses a paying subscription at period end', async () => {
    checkTeacherSubscription.mockResolvedValue({ ...liveTrial, status: 'active' });
    getSubscription.mockResolvedValue({ ...trialPolar, status: 'active', trial_end: null });
    const res = await POST(req('pause'));
    expect(res.status).toBe(200);
    expect(updateSubscription).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({ pause_at_period_end: true, resumes_at: expect.any(String) }),
    );
    expect(updateEq).not.toHaveBeenCalled();
  });

  it('applies the shared 50% discount and does not create a second one', async () => {
    listDiscounts.mockResolvedValue({
      items: [{ id: DISCOUNT, code: 'TEACHERPROKEEP50', metadata: { purpose: 'teacher_pro_retain_50_3mo' } }],
    });
    const res = await POST(req('discount'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, mechanism: 'discount', already: false });
    expect(createDiscount).not.toHaveBeenCalled();
    expect(updateSubscription).toHaveBeenCalledWith('sub_1', { discount_id: DISCOUNT });
  });

  it('creates the 50% discount once when Polar has none, scoped to Teacher Pro', async () => {
    const res = await POST(req('discount'));
    expect(res.status).toBe(200);
    expect(createDiscount).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'percentage', basis_points: 5000, duration_in_months: 3, products: ['prod_pro'] }),
    );
  });

  it('is idempotent when the trial pause or the discount is already on the row', async () => {
    getSubscription.mockResolvedValue({
      ...trialPolar,
      metadata: { user_id: 'u1', retain_offer: 'pause', retain_pause_until: '2099-01-01T00:00:00.000Z' },
    });
    expect((await POST(req('pause'))).status).toBe(200);
    expect(updateSubscription).not.toHaveBeenCalled();

    getSubscription.mockResolvedValue({ ...trialPolar, discount_id: DISCOUNT });
    process.env.POLAR_RETAIN_DISCOUNT_ID = DISCOUNT;
    const again = await POST(req('discount'));
    expect(again.status).toBe(200);
    expect((await again.json()).already).toBe(true);
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('refuses signed-out, a gift, a foreign Polar customer, and a bad offer', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await POST(req('pause'))).status).toBe(401);

    getAuthedUser.mockResolvedValue({ id: 'u1' });
    checkTeacherSubscription.mockResolvedValue({ ...liveTrial, source: 'admin_grant' });
    expect((await POST(req('pause'))).status).toBe(409);

    checkTeacherSubscription.mockResolvedValue(liveTrial);
    getSubscription.mockResolvedValue({ ...trialPolar, customer: { external_id: 'other' } });
    expect((await POST(req('discount'))).status).toBe(409);
    expect(updateSubscription).not.toHaveBeenCalled();

    expect((await POST(req('cancel'))).status).toBe(400);
  });

  it('does not write our row when Polar refuses', async () => {
    updateSubscription.mockRejectedValue(new Error('polar down'));
    expect((await POST(req('pause'))).status).toBe(502);
    expect(updateEq).not.toHaveBeenCalled();
    expect(captureProFunnelServerEvent).not.toHaveBeenCalled();
  });
});
