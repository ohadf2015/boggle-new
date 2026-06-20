import { vi, type Mock, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    headers = { get: () => null };
    private _b: unknown;
    constructor(url: string, b?: unknown) { this.url = url; this._b = b; }
    json() { return Promise.resolve(this._b); }
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(data), status: init?.status || 200,
    })),
  },
}));
vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: vi.fn() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/avatar/higgsfieldToken', () => ({
  getHiggsfieldToken: vi.fn(async () => 'tok'),
  setHiggsfieldToken: vi.fn(async () => undefined),
  clearHiggsfieldTokenCache: vi.fn(),
}));

import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { setHiggsfieldToken } from '@/lib/avatar/higgsfieldToken';

const mockAuth = verifyAdminAuth as Mock;
const mockSet = setHiggsfieldToken as Mock;
const req = (b?: unknown) => new NextRequest('http://x', b) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ success: true, user: { id: 'admin1' } });
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ credits: 100, subscription_plan_type: 'ultra' }) })) as unknown as typeof fetch;
});

describe('GET /api/admin/higgsfield-token', () => {
  it('reports validity without leaking the token', async () => {
    const res = await GET(req());
    const data = await res.json();
    expect(data).toMatchObject({ configured: true, valid: true, plan: 'ultra', credits: 100 });
    expect(JSON.stringify(data)).not.toContain('tok');
  });

  it('rejects non-admins', async () => {
    mockAuth.mockResolvedValue({ success: false, response: { json: async () => ({ error: 'x' }), status: 403 } });
    expect((await GET(req())).status).toBe(403);
  });
});

describe('PUT /api/admin/higgsfield-token', () => {
  it('stores a valid token', async () => {
    const res = await PUT(req({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith('a'.repeat(40), 'admin1');
  });

  it('400s on a too-short token', async () => {
    expect((await PUT(req({ token: 'short' }))).status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('rejects non-admins', async () => {
    mockAuth.mockResolvedValue({ success: false, response: { json: async () => ({ error: 'x' }), status: 403 } });
    expect((await PUT(req({ token: 'a'.repeat(40) }))).status).toBe(403);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
