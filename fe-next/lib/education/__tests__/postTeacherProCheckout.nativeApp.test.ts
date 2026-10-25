import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkoutFailureKey, postTeacherProCheckout } from '../postTeacherProCheckout';

vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackEduProCheckoutFailed: vi.fn() }));

describe('Teacher Pro checkout inside the native app', () => {
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it('never starts an external checkout in the Capacitor wrapper', async () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    const fetchFn = vi.fn();
    const result = await postTeacherProCheckout(fetchFn as never, { placement: 'pro_gate_reports' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(checkoutFailureKey(result)).toBe('teacher.subscription.notInApp');
  });

  it('still checks out on the web', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ url: 'https://polar.sh/c/1' }) });
    await expect(postTeacherProCheckout(fetchFn as never)).resolves.toEqual({ ok: true, url: 'https://polar.sh/c/1' });
  });

  it('maps each failure to one message key', () => {
    expect(checkoutFailureKey({ ok: false, status: 401 })).toBe('teacher.subscription.signInRequired');
    expect(checkoutFailureKey({ ok: false, status: 503 })).toBe('teacher.subscription.checkoutUnavailable');
    expect(checkoutFailureKey({ ok: false, status: 500 })).toBe('teacher.subscription.checkoutError');
  });
});
