import { vi, type Mock, describe, beforeEach, it, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    headers = { get: () => null };
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: vi.fn(),
}));

import { GET } from '../route';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

const mockVerifyAdminAuth = verifyAdminAuth as Mock;

describe('GET /api/admin/polar-status', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it('Given no admin session, When called, Then it 401s without reading env', async () => {
    mockVerifyAdminAuth.mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Missing authorization header' }, { status: 401 }),
    });

    const res = await GET(new NextRequest() as never);

    expect(res.status).toBe(401);
  });

  it('Given an admin session and fully configured env, When called, Then it reports every var present', async () => {
    mockVerifyAdminAuth.mockResolvedValue({ success: true, user: { id: 'u1', email: 'a@b.com' } });
    process.env.POLAR_ACCESS_TOKEN = 'polar_at_x';
    process.env.POLAR_PRO_PRODUCT_ID = 'prod_x';
    process.env.POLAR_WEBHOOK_SECRET = 'whsec_x';
    process.env.POLAR_ENVIRONMENT = 'production';
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';

    const res = await GET(new NextRequest() as never);
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      accessTokenSet: true,
      proProductIdSet: true,
      webhookSecretSet: true,
      polarEnvironment: 'production',
      isProductionDeploy: true,
      sandboxInProduction: false,
    });
  });

  it('Given a production deploy left on sandbox, When called, Then it flags sandboxInProduction', async () => {
    mockVerifyAdminAuth.mockResolvedValue({ success: true, user: { id: 'u1', email: 'a@b.com' } });
    process.env.POLAR_ACCESS_TOKEN = 'polar_at_x';
    process.env.POLAR_PRO_PRODUCT_ID = 'prod_x';
    process.env.POLAR_WEBHOOK_SECRET = 'whsec_x';
    process.env.POLAR_ENVIRONMENT = 'sandbox';
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';

    const res = await GET(new NextRequest() as never);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.sandboxInProduction).toBe(true);
  });

  it('Given missing env vars, When called, Then each is reported false, never the secret value', async () => {
    mockVerifyAdminAuth.mockResolvedValue({ success: true, user: { id: 'u1', email: 'a@b.com' } });
    delete process.env.POLAR_ACCESS_TOKEN;
    delete process.env.POLAR_PRO_PRODUCT_ID;
    delete process.env.POLAR_WEBHOOK_SECRET;

    const res = await GET(new NextRequest() as never);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      accessTokenSet: false,
      proProductIdSet: false,
      webhookSecretSet: false,
    });
    expect(JSON.stringify(body)).not.toContain('polar_at_x');
  });
});
