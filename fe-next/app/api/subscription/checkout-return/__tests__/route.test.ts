import { describe, it, expect, vi, beforeEach } from 'vitest';

const { maybeSingle } = vi.hoisted(() => ({
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingle(),
        }),
      }),
    }),
  }),
}));

const { logSubscriptionEvent } = vi.hoisted(() => ({
  logSubscriptionEvent: vi.fn(async () => undefined),
}));
vi.mock('@/lib/subscriptions', () => ({ logSubscriptionEvent }));

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => getAuthedUser(...args),
}));

const capture = vi.fn();
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (...a: unknown[]) => capture(...a) }),
}));

import { POST } from '../route';
import { EDU_ANALYTICS_HOST } from '@/backend/utils/educationTelemetry';

describe('POST /api/subscription/checkout-return', () => {
  beforeEach(() => {
    getAuthedUser.mockReset();
    logSubscriptionEvent.mockReset();
    logSubscriptionEvent.mockResolvedValue(undefined);
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: { is_test_account: false }, error: null });
    capture.mockReset();
  });

  it('records checkout_return_landed unconditionally (without checking grant/subscription) as both a durable event and server telemetry', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    const req = {
      headers: new Headers({
        'content-type': 'application/json',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      }),
      text: async () => JSON.stringify({ locale: 'en', path: '/en/teacher' }),
    };

    const res = await POST(req as never);
    expect(res.status).toBe(204);

    expect(logSubscriptionEvent).toHaveBeenCalledTimes(1);
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'checkout_return_landed',
      payload: {
        product: 'teacher_pro',
        provider: 'polar',
        client_kind: 'browser',
        is_test_account: false,
        test_reason: null,
        locale: 'en',
        path: '/en/teacher',
      },
    });
    expect(logSubscriptionEvent.mock.calls[0][0].payload).not.toHaveProperty('trial');

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual([
      'checkout_return_landed',
      'edu_pro_checkout_return_landed',
    ]);
    expect(capture.mock.calls[0][0].distinctId).toBe('u1');
    expect(capture.mock.calls[0][0].properties.$host).toBe(EDU_ANALYTICS_HOST);
    expect(capture.mock.calls[0][0].properties.teacher_id).toBe('u1');
  });

  it('still emits server telemetry for anonymous when session cookie expired during Polar redirect', async () => {
    getAuthedUser.mockResolvedValue(null);
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
      body: JSON.stringify({ locale: 'he', path: '/he/teacher' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);
    expect(logSubscriptionEvent).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[0][0]).toMatchObject({
      distinctId: 'anonymous',
      event: 'checkout_return_landed',
    });
  });

  it('never fails when logSubscriptionEvent throws', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    logSubscriptionEvent.mockRejectedValueOnce(new Error('db down'));
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);
    expect(capture).toHaveBeenCalledTimes(2);
  });
});
