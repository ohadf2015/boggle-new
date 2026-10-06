import { describe, it, expect, vi } from 'vitest';
import { postTeacherProCheckout } from '../postTeacherProCheckout';

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
