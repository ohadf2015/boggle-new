/**
 * POST /api/education/pro-funnel-beacon — the durable server fallback for
 * Teacher Pro client funnel steps when the bundle lacks NEXT_PUBLIC_POSTHOG_KEY.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/education/proFunnelServer', () => ({
  captureProFunnelServerEvent: (...args: unknown[]) => captureMock(...args),
}));

vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { POST } from '../route';

function req(body: string): Request {
  return new Request('http://localhost/api/education/pro-funnel-beacon', {
    method: 'POST',
    body,
  });
}

describe('POST /api/education/pro-funnel-beacon', () => {
  beforeEach(() => captureMock.mockReset());

  it('re-emits an allowlisted funnel event server-side with origin + product tags', async () => {
    const res = await POST(
      req(JSON.stringify({ event: 'checkout_return_landed', props: { provider: 'polar' } })) as never,
    );
    expect(res.status).toBe(204);
    expect(captureMock).toHaveBeenCalledTimes(1);
    const ev = captureMock.mock.calls[0][0];
    expect(ev.event).toBe('checkout_return_landed');
    expect(ev.distinctId).toBe('anonymous-beacon');
    expect(ev.properties).toMatchObject({
      provider: 'polar',
      product: 'teacher_pro',
      origin: 'client_beacon',
    });
  });

  it('emits the key-missing sentinel (it is how the dead-bundle state becomes visible in PostHog)', async () => {
    const res = await POST(
      req(JSON.stringify({ event: 'edu_pro_telemetry_client_key_missing', props: { surface: 'proFunnelTelemetry' } })) as never,
    );
    expect(res.status).toBe(204);
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock.mock.calls[0][0].event).toBe('edu_pro_telemetry_client_key_missing');
  });

  it('drops an event name that is not a pro funnel step (allowlist, still 204)', async () => {
    const res = await POST(req(JSON.stringify({ event: 'rm_rf', props: {} })) as never);
    expect(res.status).toBe(204);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('sanitizes props: primitives kept, objects/functions dropped, long strings truncated, keys bounded', async () => {
    const props: Record<string, unknown> = {
      ok_string: 'x'.repeat(400),
      ok_num: 3,
      ok_bool: true,
      ok_null: null,
      bad_obj: { nested: 1 },
      bad_arr: [1, 2],
      bad_nan: NaN, // JSON.stringify turns this into null before the route sees it
    };
    for (let i = 0; i < 30; i++) props[`filler_${i}`] = i;
    const res = await POST(req(JSON.stringify({ event: 'trial_cta_view', props })) as never);
    expect(res.status).toBe(204);
    const p = captureMock.mock.calls[0][0].properties;
    expect(p.ok_string).toHaveLength(300);
    expect(p.ok_num).toBe(3);
    expect(p.ok_bool).toBe(true);
    expect(p.ok_null).toBeNull();
    expect(p).not.toHaveProperty('bad_obj');
    expect(p).not.toHaveProperty('bad_arr');
    expect(p.bad_nan).toBeNull(); // arrived as JSON null; the Number.isFinite guard covers non-JSON callers
    // 20 client keys max, then the route's own product/origin tags
    expect(Object.keys(p).length).toBeLessThanOrEqual(22);
    expect(p.product).toBe('teacher_pro');
    expect(p.origin).toBe('client_beacon');
  });

  it('never 500s: malformed JSON and empty bodies still answer 204 without capturing', async () => {
    expect((await POST(req('{not json') as never)).status).toBe(204);
    expect((await POST(req('') as never)).status).toBe(204);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('non-object props become an empty bag rather than a crash', async () => {
    const res = await POST(req(JSON.stringify({ event: 'trial_cta_tap', props: 'junk' })) as never);
    expect(res.status).toBe(204);
    const p = captureMock.mock.calls[0][0].properties;
    expect(p).toMatchObject({ product: 'teacher_pro', origin: 'client_beacon' });
  });
});
