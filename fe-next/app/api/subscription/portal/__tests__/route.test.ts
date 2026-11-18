import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
const checkTeacherSubscription = vi.fn();
const createCustomerPortalUrl = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ createCustomerPortalUrl }) }));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { GET } from '../route';

const req = (qs = '?locale=he', ua = 'Mozilla/5.0') =>
  new NextRequest(`https://www.lexiclash.live/api/subscription/portal${qs}`, { headers: { 'user-agent': ua } });

describe('GET /api/subscription/portal: a stable card-update link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthedUser.mockResolvedValue({ id: 'u1' });
    createCustomerPortalUrl.mockResolvedValue('https://polar.sh/portal/session_fresh');
  });

  it('mints a fresh Polar portal session for a past_due teacher, even after the in-app grace ended', async () => {
    checkTeacherSubscription.mockResolvedValue({ has_pro: false, status: 'past_due', source: 'polar' });
    const res = await GET(req());
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://polar.sh/portal/session_fresh');
    expect(createCustomerPortalUrl).toHaveBeenCalledWith('u1');
  });

  it('opens the portal for a paying teacher', async () => {
    checkTeacherSubscription.mockResolvedValue({ has_pro: true, status: 'active', source: 'polar' });
    const res = await GET(req('?locale=en'));
    expect(res.headers.get('location')).toBe('https://polar.sh/portal/session_fresh');
  });

  it('sends a signed-out click to Teacher Home in their language, never to a checkout', async () => {
    getAuthedUser.mockResolvedValue(null);
    const res = await GET(req('?locale=ja'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/ja/teacher');
    expect(createCustomerPortalUrl).not.toHaveBeenCalled();
  });

  it('a gifted (admin grant) or free teacher has no Polar customer: Teacher Home', async () => {
    checkTeacherSubscription.mockResolvedValue({ has_pro: true, status: 'active', source: 'admin_grant' });
    expect((await GET(req())).headers.get('location')).toBe('/he/teacher');
    checkTeacherSubscription.mockResolvedValue({ has_pro: false, status: 'active', source: 'polar' });
    expect((await GET(req())).headers.get('location')).toBe('/he/teacher');
    expect(createCustomerPortalUrl).not.toHaveBeenCalled();
  });

  it('falls back to Teacher Home when Polar fails, and an unknown locale becomes en', async () => {
    checkTeacherSubscription.mockResolvedValue({ has_pro: false, status: 'past_due', source: 'polar' });
    createCustomerPortalUrl.mockRejectedValue(new Error('polar down'));
    const res = await GET(req('?locale=xx'));
    expect(res.headers.get('location')).toBe('/en/teacher');
  });

  it('rewrites a portal session onto the card form when the banner asks to update the card', async () => {
    checkTeacherSubscription.mockResolvedValue({ has_pro: false, status: 'past_due', source: 'polar' });
    createCustomerPortalUrl.mockResolvedValue(
      'https://polar.sh/lexiclash/portal?customer_session_token=abc&email=t%40school.org',
    );
    const res = await GET(req('?locale=he&intent=update-card'));
    expect(res.status).toBe(303);
    const dest = new URL(res.headers.get('location')!);
    expect(dest.pathname).toBe('/lexiclash/portal/settings');
    expect(dest.searchParams.get('customer_session_token')).toBe('abc');
  });

  it('never redirects to the container origin behind the proxy', async () => {
    getAuthedUser.mockResolvedValue(null);
    const r = await GET(new NextRequest('http://localhost:3000/api/subscription/portal?locale=he'));
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('/he/teacher');
  });
});
