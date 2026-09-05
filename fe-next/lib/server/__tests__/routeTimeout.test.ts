import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

import { withTimeout, withRouteTimeout, type PhaseRef } from '../routeTimeout';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('withTimeout — generic promise cap', () => {
  it('resolves with the underlying value when the work finishes first', async () => {
    const result = withTimeout(Promise.resolve('done'), 1000);
    await vi.advanceTimersByTimeAsync(0);
    await expect(result).resolves.toBe('done');
  });

  it('rejects once the cap elapses on a promise that never settles', async () => {
    const hang = new Promise<never>(() => { /* never resolves */ });
    const result = withTimeout(hang, 1000);
    const assertion = expect(result).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
  });

  it('calls onTimeout exactly once when the cap fires', async () => {
    const onTimeout = vi.fn();
    const hang = new Promise<never>(() => {});
    const result = withTimeout(hang, 500, onTimeout);
    result.catch(() => {});
    await vi.advanceTimersByTimeAsync(501);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('propagates the original rejection when the work fails before the cap', async () => {
    const result = withTimeout(Promise.reject(new Error('boom')), 1000);
    await expect(result).rejects.toThrow('boom');
  });
});

describe('withRouteTimeout — Next.js route wall-clock cap', () => {
  it('returns the route response when it resolves before the cap', async () => {
    const work = Promise.resolve({ status: 200, json: async () => ({ ok: true }) }) as any;
    const res = (await withRouteTimeout({ label: 'test-route', ms: 1000 }, work)) as any;
    expect(res.status).toBe(200);
  });

  it('returns a 504 once the cap elapses on a route that hangs', async () => {
    const hang = new Promise<never>(() => {}) as any;
    const responsePromise = withRouteTimeout({ label: 'test-route', ms: 2000 }, hang);
    await vi.advanceTimersByTimeAsync(2001);
    const res = (await responsePromise) as any;
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toMatch(/timeout/i);
  });

  it('logs the phase the route was stuck at when it times out', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const phaseRef: PhaseRef<'a' | 'b'> = { current: 'a', method: 'POST' };
    const hang = new Promise<never>(() => {}) as any;
    const responsePromise = withRouteTimeout({ label: 'test-route', ms: 1000, phaseRef }, hang);
    phaseRef.current = 'b';
    await vi.advanceTimersByTimeAsync(1001);
    await responsePromise;
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stuck-at=b'));
    warn.mockRestore();
  });

  it('supports a custom timeout response', async () => {
    const hang = new Promise<never>(() => {}) as any;
    const responsePromise = withRouteTimeout(
      { label: 'test-route', ms: 500, onTimeoutResponse: () => ({ status: 503, json: async () => ({ error: 'custom' }) }) as any },
      hang,
    );
    await vi.advanceTimersByTimeAsync(501);
    const res = (await responsePromise) as any;
    expect(res.status).toBe(503);
  });
});
