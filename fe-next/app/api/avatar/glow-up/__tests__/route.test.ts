import { vi, type Mock, describe, beforeEach, it, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers = { get: () => null };
    private _body: unknown;
    constructor(url: string, body?: unknown) {
      this.url = url;
      this._body = body;
    }
    json() {
      return Promise.resolve(this._body);
    }
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: vi.fn() }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
const mockGenerateFn = vi.fn(async () => ({ url: 'https://cdn/glow.png' }));
vi.mock('@/lib/avatar/glowUpProvider.server', () => ({
  rasterizeSvgToPng: vi.fn(async () => Buffer.from([0x89, 0x50])),
  getServerGlowUpProvider: vi.fn(() => ({ generate: mockGenerateFn })),
}));

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const mockAuth = verifyAdminAuth as Mock;
const mockGetAdmin = getSupabaseAdmin as Mock;
const mockGenerate = mockGenerateFn as Mock;

function supabaseOk() {
  const eq = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ update })), _update: update, _eq: eq };
}

function req(body: unknown) {
  return new NextRequest('http://x/api/avatar/glow-up', body) as unknown as NextRequest;
}

const validBody = { svgString: '<svg/>', config: DEFAULT_AVATAR_CONFIG };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ success: true, user: { id: 'u1', email: 'a@b.c' } });
  mockGetAdmin.mockReturnValue(supabaseOk());
  mockGenerate.mockResolvedValue({ url: 'https://cdn/glow.png' });
});

describe('POST /api/avatar/glow-up', () => {
  it('rejects non-admins with the auth response', async () => {
    const denied = { json: () => Promise.resolve({ error: 'Admin access required' }), status: 403 };
    mockAuth.mockResolvedValue({ success: false, response: denied });
    const res = await POST(req(validBody));
    expect(res.status).toBe(403);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('generates and persists a render for an admin', async () => {
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ url: 'https://cdn/glow.png', status: 'ready' });
    expect(typeof data.seedHash).toBe('string');
    expect(mockGenerate).toHaveBeenCalledOnce();
  });

  it('400s when the svg is missing', async () => {
    const res = await POST(req({ config: DEFAULT_AVATAR_CONFIG }));
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('400s when the config is invalid', async () => {
    const res = await POST(req({ svgString: '<svg/>', config: { base: 'not-a-real-base' } }));
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('500s when generation throws', async () => {
    mockGenerate.mockRejectedValue(new Error('cli boom'));
    const res = await POST(req(validBody));
    expect(res.status).toBe(500);
  });

  it('surfaces the real failure reason (admin-only route) so it is diagnosable', async () => {
    // The opaque generic message left admins unable to tell "no Higgsfield token"
    // from a real bug. This route is admin-gated, so returning the cause is safe.
    mockGenerate.mockRejectedValue(new Error('No Higgsfield token (set via admin token endpoint or HIGGSFIELD_TOKEN)'));
    const res = await POST(req(validBody));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('No Higgsfield token');
  });
});
