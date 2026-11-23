import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
const checkTeacherSubscription = vi.fn();
const resumeSubscription = vi.fn();
const selectSingle = vi.fn();
const updateEq = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ resumeSubscription }) }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: selectSingle }) }),
      update: (row: unknown) => ({ eq: (...a: unknown[]) => updateEq(row, ...a) }),
    }),
  }),
}));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { POST } from '../route';

const req = () => new NextRequest('https://www.lexiclash.live/api/subscription/resume', { method: 'POST' });
const cancelledTrial = { has_pro: true, status: 'trialing', source: 'polar', cancel_at_period_end: true };

describe('POST /api/subscription/resume: keep Pro after cancelling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthedUser.mockResolvedValue({ id: 'u1' });
    checkTeacherSubscription.mockResolvedValue(cancelledTrial);
    selectSingle.mockResolvedValue({ data: { lemon_squeezy_subscription_id: 'sub_1' }, error: null });
    resumeSubscription.mockResolvedValue(undefined);
    updateEq.mockResolvedValue({ error: null });
  });

  it('turns renewal back on at Polar for a teacher whose trial is set to end, without a new checkout', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(resumeSubscription).toHaveBeenCalledWith('sub_1');
    expect(updateEq).toHaveBeenCalledWith({ cancel_at_period_end: false }, 'user_id', 'u1');
  });

  it('also works for a paying teacher who cancelled before the renewal date', async () => {
    checkTeacherSubscription.mockResolvedValue({ ...cancelledTrial, status: 'active' });
    expect((await POST(req())).status).toBe(200);
  });

  it('refuses a signed-out request', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await POST(req())).status).toBe(401);
    expect(resumeSubscription).not.toHaveBeenCalled();
  });

  it('refuses when there is nothing to resume: not cancelled, ended, or not a Polar plan', async () => {
    for (const sub of [
      { ...cancelledTrial, cancel_at_period_end: false },
      { ...cancelledTrial, has_pro: false, status: 'canceled' },
      { ...cancelledTrial, source: 'admin_grant' },
    ]) {
      checkTeacherSubscription.mockResolvedValue(sub);
      expect((await POST(req())).status).toBe(409);
    }
    expect(resumeSubscription).not.toHaveBeenCalled();
  });

  it('reports a Polar failure as an error and leaves our row alone', async () => {
    resumeSubscription.mockRejectedValue(new Error('polar down'));
    expect((await POST(req())).status).toBe(502);
    expect(updateEq).not.toHaveBeenCalled();
  });
});
