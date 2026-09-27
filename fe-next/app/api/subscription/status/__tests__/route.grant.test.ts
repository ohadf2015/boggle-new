import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn(async () => ({ id: 'u1', email: 't@x.org' }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
const checkTeacherSubscription = vi.fn();
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
const createCustomerPortalUrl = vi.fn(async () => 'https://polar.sh/portal');
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ createCustomerPortalUrl }) }));
const grantRow: Record<string, unknown> | null = { id: 'g1', welcomed_at: null, note: 'Sorry about Thursday', expires_at: '2027-09-05T00:00:00Z', days: 365 };
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ is: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: grantRow, error: null }) }) }) }) }) }) }),
  }),
}));

import { GET } from '../route';

const req = () => new NextRequest('http://localhost/api/subscription/status');

describe('GET /api/subscription/status with a complimentary grant', () => {
  beforeEach(() => { createCustomerPortalUrl.mockClear(); });

  it('reports the grant, its deadline and whether the celebration was shown — and skips the Polar portal', async () => {
    checkTeacherSubscription.mockResolvedValue({
      has_pro: true, tier: 'pro', status: 'active', source: 'admin_grant', grant_expired: false,
      current_period_end: '2027-09-05T00:00:00Z', cancel_at_period_end: false,
    });
    const res = await GET(req());
    const body = await res.json();
    expect(body.has_pro).toBe(true);
    expect(body.source).toBe('admin_grant');
    expect(body.portal_url).toBeNull();
    expect(createCustomerPortalUrl).not.toHaveBeenCalled();
    expect(body.grant).toMatchObject({ id: 'g1', welcomed: false, expires_at: '2027-09-05T00:00:00Z' });
  });

  it('a lapsed grant is free, and says so', async () => {
    checkTeacherSubscription.mockResolvedValue({
      has_pro: false, tier: 'pro', status: 'active', source: 'admin_grant', grant_expired: true,
      current_period_end: '2026-01-01T00:00:00Z', cancel_at_period_end: false,
    });
    const body = await (await GET(req())).json();
    expect(body.has_pro).toBe(false);
    expect(body.grant_expired).toBe(true);
  });

  it('a paid subscription still gets its portal link', async () => {
    checkTeacherSubscription.mockResolvedValue({
      has_pro: true, tier: 'pro', status: 'active', source: 'polar', grant_expired: false,
      current_period_end: '2026-10-05T00:00:00Z', cancel_at_period_end: false,
    });
    const body = await (await GET(req())).json();
    expect(body.portal_url).toBe('https://polar.sh/portal');
    expect(body.grant).toBeNull();
  });
});
