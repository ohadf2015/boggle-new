import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => ({ id: 'u1', email: 't@x.org' }) }));
const checkTeacherSubscription = vi.fn();
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ createCustomerPortalUrl: async () => 'https://polar.sh/portal' }) }));

let accessRow: { trial_expires_at: string | null } | null = null;
let accessError: unknown = null;
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'teacher_access_requests') {
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.order = () => chain;
        chain.limit = () => chain;
        chain.maybeSingle = async () => ({ data: accessRow, error: accessError });
        return chain;
      }
      return { select: () => ({ eq: () => ({ contains: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) };
    },
  }),
}));

import { GET } from '../route';

const free = {
  has_pro: false, tier: 'free', status: 'active', source: 'polar', grant_expired: false,
  current_period_end: null, cancel_at_period_end: false,
};
const req = () => new NextRequest('http://localhost/api/subscription/status');
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

describe('GET /api/subscription/status — access trial', () => {
  beforeEach(() => {
    accessRow = null;
    accessError = null;
    checkTeacherSubscription.mockResolvedValue(free);
  });

  it('exposes the live access-trial end for a free teacher', async () => {
    const end = inDays(9);
    accessRow = { trial_expires_at: end };
    expect((await (await GET(req())).json()).access_trial_expires).toBe(end);
  });

  it('null once the access trial has ended', async () => {
    accessRow = { trial_expires_at: inDays(-1) };
    expect((await (await GET(req())).json()).access_trial_expires).toBeNull();
  });

  it('null for a teacher with no approved request, and when the read fails', async () => {
    expect((await (await GET(req())).json()).access_trial_expires).toBeNull();
    accessError = { message: 'boom' };
    accessRow = { trial_expires_at: inDays(5) };
    expect((await (await GET(req())).json()).access_trial_expires).toBeNull();
  });

  it('a Pro teacher is never queried or told about an access trial', async () => {
    accessRow = { trial_expires_at: inDays(5) };
    checkTeacherSubscription.mockResolvedValue({ ...free, has_pro: true, tier: 'pro' });
    expect((await (await GET(req())).json()).access_trial_expires).toBeNull();
  });
});
