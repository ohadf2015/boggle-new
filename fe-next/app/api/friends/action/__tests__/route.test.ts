import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const authed = vi.fn();
const run = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: () => authed() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/friendActions', () => ({
  FRIEND_ACTIONS: ['request', 'accept', 'unfriend', 'block', 'unblock'],
  runFriendAction: (...a: unknown[]) => run(...a),
}));

import { POST } from '../route';

const ID = '11111111-1111-1111-1111-111111111111';
const post = (body: unknown) =>
  POST(new NextRequest('http://x/api/friends/action', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/friends/action', () => {
  beforeEach(() => {
    authed.mockReset().mockResolvedValue({ id: 'me' });
    run.mockReset().mockResolvedValue({ success: true });
  });

  it('Given no session, Then 401 and nothing runs', async () => {
    authed.mockResolvedValue(null);
    expect((await post({ action: 'request', target: ID })).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it('Given an unknown action or a non-uuid target, Then 400', async () => {
    expect((await post({ action: 'nuke', target: ID })).status).toBe(400);
    expect((await post({ action: 'request', target: 'x' })).status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it('Given a valid action, Then it runs as the session user', async () => {
    const res = await post({ action: 'accept', target: ID });
    expect(await res.json()).toEqual({ success: true });
    expect(run).toHaveBeenCalledWith('me', 'accept', ID);
  });

  it('Given a policy rejection, Then 403 with the code', async () => {
    run.mockResolvedValue({ success: false, code: 'SOCIAL_RESTRICTED' });
    const res = await post({ action: 'request', target: ID });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ success: false, code: 'SOCIAL_RESTRICTED' });
  });
});
