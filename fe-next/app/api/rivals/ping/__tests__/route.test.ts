import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(), cookieAccessToken: vi.fn(async () => null) }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn(() => ({ from: vi.fn() })) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/server/claimOnce', () => ({ claimOnce: vi.fn(async () => 'claimed') }));
vi.mock('@/lib/rivals/pingServer', () => ({ checkPingAllowed: vi.fn(), grantPingAchievements: vi.fn(async () => []) }));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyRivalPing: vi.fn(async () => undefined) }));

import { POST } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { claimOnce } from '@/lib/server/claimOnce';
import { checkPingAllowed, grantPingAchievements } from '@/lib/rivals/pingServer';
import { notifyRivalPing } from '@/backend/modules/pushNotificationTriggers';

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';

function b64url(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function req(body: unknown, opts: { anonymous?: boolean } = {}) {
  const token = `${b64url({ alg: 'HS256' })}.${b64url({ sub: ME, is_anonymous: opts.anonymous === true })}.sig`;
  return {
    method: 'POST',
    headers: new Headers({ authorization: `Bearer ${token}` }),
    json: async () => body,
  } as never;
}
const valid = { targetUserId: THEM, pingId: 'rematch', context: 'multiplayer' };
const read = async (r: unknown) => {
  const res = r as { status: number; json: () => Promise<Record<string, unknown>> };
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthedUser).mockResolvedValue({ id: ME });
  vi.mocked(checkPingAllowed).mockResolvedValue({ ok: true, senderName: 'Maya' });
});

describe('POST /api/rivals/ping', () => {
  it('sends the ping when every rule passes', async () => {
    const { status, body } = await read(await POST(req(valid)));
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(notifyRivalPing).toHaveBeenCalledWith(THEM, 'Maya', ME, 'rematch');
    expect(grantPingAchievements).toHaveBeenCalledWith(expect.anything(), ME);
  });

  it('turns guests away with sign_in_required', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);
    const { status, body } = await read(await POST(req(valid)));
    expect(status).toBe(401);
    expect(body.error).toBe('sign_in_required');
    expect(notifyRivalPing).not.toHaveBeenCalled();
  });

  it('treats an anonymous session as a guest', async () => {
    const { status, body } = await read(await POST(req(valid, { anonymous: true })));
    expect(status).toBe(401);
    expect(body.error).toBe('sign_in_required');
  });

  it.each([
    { ...valid, pingId: 'you suck' },
    { ...valid, targetUserId: 'not-a-uuid' },
    { ...valid, context: 'lobby' },
    null,
  ])('rejects a malformed body %#', async (b) => {
    const { status, body } = await read(await POST(req(b)));
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_request');
  });

  it('accepts a ping-back from the incoming toast', async () => {
    const { status } = await read(await POST(req({ ...valid, context: 'reply' })));
    expect(status).toBe(200);
  });

  it('never sends from a classroom screen', async () => {
    const { status, body } = await read(await POST(req({ ...valid, context: 'edu' })));
    expect(status).toBe(403);
    expect(body.error).toBe('not_allowed');
    expect(checkPingAllowed).not.toHaveBeenCalled();
  });

  it('passes a refusal through with its code and status', async () => {
    vi.mocked(checkPingAllowed).mockResolvedValue({ ok: false, code: 'daily_limit', status: 429 });
    const { status, body } = await read(await POST(req(valid)));
    expect(status).toBe(429);
    expect(body.error).toBe('daily_limit');
    expect(notifyRivalPing).not.toHaveBeenCalled();
  });

  it('closes the double-tap race on the same target', async () => {
    vi.mocked(claimOnce).mockResolvedValueOnce('taken');
    const { status, body } = await read(await POST(req(valid)));
    expect(status).toBe(429);
    expect(body.error).toBe('target_cooldown');
    expect(notifyRivalPing).not.toHaveBeenCalled();
  });

  it('503s when the database is not configured', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValueOnce(null as never);
    const { status, body } = await read(await POST(req(valid)));
    expect(status).toBe(503);
    expect(body.error).toBe('unavailable');
  });
});
