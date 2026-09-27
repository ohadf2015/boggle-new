import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn(async () => ({ id: 'u1', email: 't@x.org' }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
const checkTeacherSubscription = vi.fn();
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ createCustomerPortalUrl: async () => 'https://polar.sh/portal' }) }));

let trialRows: Array<{ id: string }> = [];
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          contains: () => ({
            limit: async () => ({ data: trialRows, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

import { GET } from '../route';

const req = () => new NextRequest('http://localhost/api/subscription/status');

describe('GET /api/subscription/status Polar trial', () => {
  beforeEach(() => { trialRows = []; });

  it('exposes trial_expires while the row is trialing', async () => {
    checkTeacherSubscription.mockResolvedValue({
      has_pro: true, tier: 'pro', status: 'trialing', source: 'polar', grant_expired: false,
      current_period_end: '2026-10-08T00:00:00Z', cancel_at_period_end: false,
    });
    const body = await (await GET(req())).json();
    expect(body.trial_expires).toBe('2026-10-08T00:00:00Z');
    expect(body.trial_used).toBe(true);
    expect(body.has_pro).toBe(true);
  });

  it('a paying row has no trial_expires and can still be marked used', async () => {
    trialRows = [{ id: 'e1' }];
    checkTeacherSubscription.mockResolvedValue({
      has_pro: true, tier: 'pro', status: 'active', source: 'polar', grant_expired: false,
      current_period_end: '2026-11-08T00:00:00Z', cancel_at_period_end: false,
    });
    const body = await (await GET(req())).json();
    expect(body.trial_expires).toBeNull();
    expect(body.trial_used).toBe(true);
    expect(body.status).toBe('active');
  });

  it('an ended trial is not Pro and trial_expires is null, but trial_used stays', async () => {
    trialRows = [{ id: 'e1' }];
    checkTeacherSubscription.mockResolvedValue({
      has_pro: false, tier: 'free', status: 'canceled', source: 'polar', grant_expired: false,
      current_period_end: '2026-10-08T00:00:00Z', cancel_at_period_end: false,
    });
    const body = await (await GET(req())).json();
    expect(body.has_pro).toBe(false);
    expect(body.trial_expires).toBeNull();
    expect(body.trial_used).toBe(true);
  });

  it('a teacher who never trialed is not marked used', async () => {
    checkTeacherSubscription.mockResolvedValue({
      has_pro: false, tier: 'free', status: 'active', source: 'polar', grant_expired: false,
      current_period_end: null, cancel_at_period_end: false,
    });
    const body = await (await GET(req())).json();
    expect(body.trial_expires).toBeNull();
    expect(body.trial_used).toBe(false);
  });
});
