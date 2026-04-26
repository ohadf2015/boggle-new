import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockClaim, mockGetUser } = vi.hoisted(() => ({
  mockClaim: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));
vi.mock('@/backend/services/economy/claimBoost', () => ({
  claimBoostServer: (...args: unknown[]) => mockClaim(...args),
}));

import { POST } from '../route';

function makeReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/boosts/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BOOST_TOKEN_SECRET = 'test-secret';
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
});

describe('POST /api/boosts/claim', () => {
  it('401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'no auth' } });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(401);
  });

  it('400 when adReceipt.watched != true', async () => {
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: false } }));
    expect(res.status).toBe(400);
  });

  it('400 when boostType invalid', async () => {
    const res = await POST(makeReq({ sessionId: 's', boostType: 'sabotage', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('400 when sessionId is empty', async () => {
    const res = await POST(makeReq({ sessionId: '', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('400 when sessionId is missing', async () => {
    const res = await POST(makeReq({ boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('400 when sessionId exceeds 128 chars', async () => {
    const res = await POST(makeReq({ sessionId: 'x'.repeat(129), boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('200 + token on success', async () => {
    mockClaim.mockResolvedValueOnce({ success: true, remaining: 4, token: 'b1.s.hint.999.sig' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe('b1.s.hint.999.sig');
    expect(body.remaining).toBe(4);
  });

  it('429 on cap_reached', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'cap_reached' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(429);
  });

  it('409 on already_claimed', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'already_claimed' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(409);
  });

  it('400 on invalid_type error', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'invalid_type' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('400 on invalid_session error', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'invalid_session' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(400);
  });

  it('404 on profile_not_found', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'profile_not_found' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(404);
  });

  it('503 on no_supabase', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'no_supabase' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(503);
  });

  it('500 on rpc_failed', async () => {
    mockClaim.mockResolvedValueOnce({ success: false, error: 'rpc_failed' });
    const res = await POST(makeReq({ sessionId: 's', boostType: 'hint', adReceipt: { watched: true } }));
    expect(res.status).toBe(500);
  });
});
