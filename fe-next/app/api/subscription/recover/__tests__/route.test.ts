import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { signDunningRecover } from '@/lib/education/dunningEscalation';

const checkTeacherSubscription = vi.fn();
const createCustomerPortalUrl = vi.fn();
const capture = vi.fn();

vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: () => ({ createCustomerPortalUrl }) }));
vi.mock('@/lib/education/proFunnelServer', () => ({
  buildRecoveryCtaClickedEvent: (userId: string, args: { surface: string; day: number }) => ({
    event: 'recovery_cta_clicked',
    distinctId: userId,
    properties: args,
  }),
  captureProFunnelServerEvent: (...a: unknown[]) => capture(...a),
}));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { GET } from '../route';

const USER = '11111111-1111-4111-8111-111111111111';
const SECRET = 'cron-test-secret';
const PORTAL = 'https://polar.sh/lexiclash/portal?customer_session_token=abc&email=t%40school.org';

function req(token: string) {
  return new NextRequest(`https://www.lexiclash.live/api/subscription/recover?t=${encodeURIComponent(token)}&locale=he`);
}

describe('GET /api/subscription/recover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    checkTeacherSubscription.mockResolvedValue({ has_pro: false, status: 'past_due', source: 'polar' });
    createCustomerPortalUrl.mockResolvedValue(PORTAL);
  });

  it('mints a fresh session and redirects to the Polar payment-update page, no LexiClash login', async () => {
    const token = signDunningRecover({ userId: USER, day: 5, exp: Date.now() + 60_000 }, SECRET);
    const res = await GET(req(token));
    expect(res.status).toBe(303);
    const dest = new URL(res.headers.get('location')!);
    expect(dest.pathname).toBe('/lexiclash/portal/settings');
    expect(dest.searchParams.get('customer_session_token')).toBe('abc');
    expect(createCustomerPortalUrl).toHaveBeenCalledWith(USER);
    expect(capture).toHaveBeenCalledWith(expect.objectContaining({
      event: 'recovery_cta_clicked',
      properties: { surface: 'dunning_email', day: 5 },
    }));
  });

  it('sends a bad or expired token to Teacher Home, never to checkout', async () => {
    const expired = signDunningRecover({ userId: USER, day: 5, exp: Date.now() - 1000 }, SECRET);
    const res = await GET(req(expired));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/he/teacher');
    expect(createCustomerPortalUrl).not.toHaveBeenCalled();
  });
});
