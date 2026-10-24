import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postTeacherProCheckout } from '../postTeacherProCheckout';

const failed = vi.hoisted(() => vi.fn());
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProCheckoutFailed: (payload: unknown) => failed(payload),
}));

describe('postTeacherProCheckout', () => {
  it('POSTs /api/subscription/checkout with no body and returns Polar url', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://polar.sh/checkout/abc' }),
    });
    await expect(postTeacherProCheckout(fetchFn)).resolves.toEqual({
      ok: true,
      url: 'https://polar.sh/checkout/abc',
    });
    expect(fetchFn).toHaveBeenCalledWith('/api/subscription/checkout', { method: 'POST' });
  });

  it('POSTs { trial: true } when starting the Polar 14-day trial', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://polar.sh/checkout/trial' }),
    });
    await expect(postTeacherProCheckout(fetchFn, { trial: true })).resolves.toEqual({
      ok: true,
      url: 'https://polar.sh/checkout/trial',
    });
    expect(fetchFn).toHaveBeenCalledWith('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial: true }),
    });
  });

  it('passes the locale through to the checkout body when provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://polar.sh/checkout/he' }),
    });
    await expect(
      postTeacherProCheckout(fetchFn, { trial: false, locale: 'he' }),
    ).resolves.toEqual({ ok: true, url: 'https://polar.sh/checkout/he' });
    expect(fetchFn).toHaveBeenCalledWith('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial: false, locale: 'he' }),
    });
  });

  it('surfaces 401 and 503 instead of inventing a URL', async () => {
    const fetch401 = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await expect(postTeacherProCheckout(fetch401)).resolves.toEqual({ ok: false, status: 401 });
    const fetch503 = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(postTeacherProCheckout(fetch503)).resolves.toEqual({ ok: false, status: 503 });
  });

  it('treats a 200 without a url as failure', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    await expect(postTeacherProCheckout(fetchFn)).resolves.toEqual({ ok: false, status: 200 });
  });
});

describe('postTeacherProCheckout failure telemetry', () => {
  beforeEach(() => {
    failed.mockReset();
  });

  const res = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

  it.each([
    [503, 'http_503'],
    [500, 'http_500'],
    [401, 'unauthorized'],
  ])('Given the checkout answers %s, When posted, Then edu_pro_checkout_failed carries %s, the placement and trial', async (status, reason) => {
    await postTeacherProCheckout(vi.fn().mockResolvedValue(res(status)), { trial: true, locale: 'en', placement: 'dashboard_trial_offer' });
    expect(failed).toHaveBeenCalledWith({ reason, placement: 'dashboard_trial_offer', trial: true });
  });

  it('Given a 200 with no url, When posted, Then the reason is no_url', async () => {
    await postTeacherProCheckout(vi.fn().mockResolvedValue(res(200, {})), { placement: 'hq_trial_status' });
    expect(failed).toHaveBeenCalledWith({ reason: 'no_url', placement: 'hq_trial_status', trial: false });
  });

  it('Given a 200 whose body is not JSON, When posted, Then the reason is no_url', async () => {
    const bad = { ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } };
    await postTeacherProCheckout(vi.fn().mockResolvedValue(bad), { placement: 'p' });
    expect(failed).toHaveBeenCalledWith({ reason: 'no_url', placement: 'p', trial: false });
  });

  it('Given the request never returns, When posted, Then network is reported and the error still reaches the caller', async () => {
    await expect(postTeacherProCheckout(vi.fn().mockRejectedValue(new TypeError('offline')), { trial: false, placement: 'p' })).rejects.toThrow('offline');
    expect(failed).toHaveBeenCalledWith({ reason: 'network', placement: 'p', trial: false });
  });

  it('Given a successful checkout, When posted, Then nothing is reported', async () => {
    await postTeacherProCheckout(vi.fn().mockResolvedValue(res(200, { url: 'https://polar.sh/c/1' })), { placement: 'p' });
    expect(failed).not.toHaveBeenCalled();
  });

  it('Given only a placement, When posted, Then the request still has no body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200, { url: 'https://polar.sh/c/1' }));
    await postTeacherProCheckout(fetchFn, { placement: 'hq_trial_status' });
    expect(fetchFn).toHaveBeenCalledWith('/api/subscription/checkout', { method: 'POST' });
  });

  it('Given no placement, When it fails, Then it is reported as other', async () => {
    await postTeacherProCheckout(vi.fn().mockResolvedValue(res(502)));
    expect(failed).toHaveBeenCalledWith({ reason: 'http_502', placement: 'other', trial: false });
  });
});
