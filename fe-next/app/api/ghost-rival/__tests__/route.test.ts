import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const authed = vi.fn();
const getOrCreate = vi.fn();
const updateScore = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: () => authed() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/ghostRivalManager', () => ({
  getOrCreateWeeklyRival: (...a: unknown[]) => getOrCreate(...a),
  updateRivalScore: (...a: unknown[]) => updateScore(...a),
}));

import { GET, POST } from '../route';

const post = (body: unknown) =>
  POST(new NextRequest('http://x/api/ghost-rival', { method: 'POST', body: JSON.stringify(body) }));

describe('/api/ghost-rival', () => {
  beforeEach(() => {
    authed.mockReset().mockResolvedValue({ id: 'me' });
    getOrCreate.mockReset().mockResolvedValue(null);
    updateScore.mockReset().mockResolvedValue({ newScore: 5 });
  });

  it('Given no session, When GET, Then 401 and no rival row is created', async () => {
    authed.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://x/api/ghost-rival?userId=victim'));
    expect(res.status).toBe(401);
    expect(getOrCreate).not.toHaveBeenCalled();
  });

  it('Given a session, When GET names another user, Then the session user is used', async () => {
    await GET(new NextRequest('http://x/api/ghost-rival?userId=victim'));
    expect(getOrCreate).toHaveBeenCalledWith('me');
  });

  it('Given no session, When POST, Then 401 and no score is written', async () => {
    authed.mockResolvedValue(null);
    expect((await post({ userId: 'victim', points: 999 })).status).toBe(401);
    expect(updateScore).not.toHaveBeenCalled();
  });

  it('Given a session, When POST names another user, Then only the caller is credited', async () => {
    await post({ userId: 'victim', points: 7 });
    expect(updateScore).toHaveBeenCalledWith('me', 7);
  });
});
