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

const { getCheckout, grantProOnCheckoutReturn } = vi.hoisted(() => ({
  getCheckout: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
  grantProOnCheckoutReturn: vi.fn(async (): Promise<'granted' | 'skipped' | 'failed'> => 'skipped'),
}));
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ getCheckout }),
}));
vi.mock('@/lib/education/grantProOnCheckoutReturn', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/education/grantProOnCheckoutReturn')>();
  return { ...actual, grantProOnCheckoutReturn };
});

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
    getCheckout.mockReset();
    getCheckout.mockResolvedValue(null);
    grantProOnCheckoutReturn.mockReset();
    grantProOnCheckoutReturn.mockResolvedValue('skipped');
    delete process.env.POLAR_PRO_PRODUCT_ID;
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
        status: 'no_checkout_id',
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
    expect(capture.mock.calls[0][0].properties.status).toBe('no_checkout_id');
  });

  it('attributes the return to the exact Polar checkout: checkout_id + Polar status + $current_url on both events and the durable row', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    getCheckout.mockResolvedValue({ status: 'succeeded', external_customer_id: 'u1', product_id: 'prod_pro' });
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    const url = `https://www.lexiclash.live/en/teacher?checkout=success&checkout_id=${checkoutId}`;
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
      body: JSON.stringify({ locale: 'en', path: '/en/teacher', checkout_id: checkoutId, url }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);

    expect(getCheckout).toHaveBeenCalledWith(checkoutId);
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'checkout_return_landed',
      payload: expect.objectContaining({
        checkout_id: checkoutId,
        status: 'succeeded',
        current_url: url,
      }),
    });
    for (const [arg] of capture.mock.calls) {
      expect(arg.properties).toMatchObject({
        checkout_id: checkoutId,
        status: 'succeeded',
        $current_url: url,
      });
    }
  });

  it('an anonymous return with a checkout id is still attributed (expired cookie after the Polar redirect)', async () => {
    getAuthedUser.mockResolvedValue(null);
    getCheckout.mockResolvedValue({ status: 'expired' });
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
      body: JSON.stringify({ checkout_id: checkoutId }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);
    expect(logSubscriptionEvent).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledTimes(2);
    for (const [arg] of capture.mock.calls) {
      expect(arg.properties).toMatchObject({ checkout_id: checkoutId, status: 'expired' });
    }
  });

  it('a malformed checkout id is dropped, and status says unknown once Polar was never asked', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
      body: JSON.stringify({ checkout_id: 'not-a-uuid" OR 1=1 --' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);
    expect(getCheckout).not.toHaveBeenCalled();
    expect(logSubscriptionEvent.mock.calls[0][0].payload).not.toHaveProperty('checkout_id');
    expect(logSubscriptionEvent.mock.calls[0][0].payload.status).toBe('no_checkout_id');
  });

  it('a Polar status lookup failure records status unknown and still answers 204', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    getCheckout.mockRejectedValue(new Error('polar down'));
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
      body: JSON.stringify({ checkout_id: checkoutId }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);
    expect(logSubscriptionEvent.mock.calls[0][0].payload).toMatchObject({
      checkout_id: checkoutId,
      status: 'unknown',
    });
  });

  it('a $current_url from a foreign host is dropped', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    const req = new Request('http://localhost/api/subscription/checkout-return', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://evil.example.com/?checkout=success' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(204);
    expect(logSubscriptionEvent.mock.calls[0][0].payload).not.toHaveProperty('current_url');
    expect(capture.mock.calls[0][0].properties).not.toHaveProperty('$current_url');
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

  it('unlocks Teacher Pro on return when Polar already says this teacher’s checkout succeeded', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    process.env.POLAR_PRO_PRODUCT_ID = 'prod_pro';
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    const checkout = {
      id: checkoutId,
      status: 'succeeded',
      external_customer_id: 'u1',
      product_id: 'prod_pro',
      subscription_id: 'sub_1',
    };
    getCheckout.mockResolvedValue(checkout);
    grantProOnCheckoutReturn.mockResolvedValue('granted');

    const res = await POST(
      new Request('http://localhost/api/subscription/checkout-return', {
        method: 'POST',
        body: JSON.stringify({ checkout_id: checkoutId }),
      }) as never,
    );
    expect(res.status).toBe(204);
    expect(grantProOnCheckoutReturn).toHaveBeenCalledWith({
      checkout,
      authedUserId: 'u1',
      proProductId: 'prod_pro',
    });
    expect(logSubscriptionEvent.mock.calls[0][0].payload).toMatchObject({
      checkout_id: checkoutId,
      status: 'succeeded',
      grant: 'granted',
    });
    expect(logSubscriptionEvent.mock.calls[0][0].payload).not.toHaveProperty('trial');
    expect(capture.mock.calls[0][0].properties.grant).toBe('granted');
  });

  it('does not grant another teacher’s succeeded checkout to the signed-in user', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    process.env.POLAR_PRO_PRODUCT_ID = 'prod_pro';
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    getCheckout.mockResolvedValue({
      status: 'succeeded',
      external_customer_id: 'someone-else',
      product_id: 'prod_pro',
    });
    grantProOnCheckoutReturn.mockResolvedValue('skipped');

    const res = await POST(
      new Request('http://localhost/api/subscription/checkout-return', {
        method: 'POST',
        body: JSON.stringify({ checkout_id: checkoutId }),
      }) as never,
    );
    expect(res.status).toBe(204);
    expect(grantProOnCheckoutReturn).toHaveBeenCalled();
    expect(logSubscriptionEvent.mock.calls[0][0].payload.grant).toBe('skipped');
  });

  it('does not grant on an anonymous return, even when Polar says succeeded', async () => {
    getAuthedUser.mockResolvedValue(null);
    getCheckout.mockResolvedValue({
      status: 'succeeded',
      external_customer_id: 'u1',
      product_id: 'prod_pro',
    });
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    const res = await POST(
      new Request('http://localhost/api/subscription/checkout-return', {
        method: 'POST',
        body: JSON.stringify({ checkout_id: checkoutId }),
      }) as never,
    );
    expect(res.status).toBe(204);
    expect(grantProOnCheckoutReturn).not.toHaveBeenCalled();
    expect(logSubscriptionEvent).not.toHaveBeenCalled();
  });

  it('still answers 204 when the grant write fails', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' });
    process.env.POLAR_PRO_PRODUCT_ID = 'prod_pro';
    const checkoutId = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    getCheckout.mockResolvedValue({
      status: 'succeeded',
      external_customer_id: 'u1',
      product_id: 'prod_pro',
    });
    grantProOnCheckoutReturn.mockRejectedValue(new Error('db down'));

    const res = await POST(
      new Request('http://localhost/api/subscription/checkout-return', {
        method: 'POST',
        body: JSON.stringify({ checkout_id: checkoutId }),
      }) as never,
    );
    expect(res.status).toBe(204);
    expect(logSubscriptionEvent.mock.calls[0][0].payload.grant).toBe('failed');
    expect(capture).toHaveBeenCalledTimes(2);
  });
});
