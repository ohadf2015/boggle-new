import { vi, type Mock, describe, beforeEach, it, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers = { get: () => null };
    constructor(url: string) {
      this.url = url;
    }
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

vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

const checkTeacherSubscription = vi.fn();
vi.mock('@/lib/subscriptions', () => ({
  checkTeacherSubscription: (...a: unknown[]) => checkTeacherSubscription(...a),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

const mockVerifyAdminAuth = verifyAdminAuth as Mock;
const mockGetSupabaseAdmin = getSupabaseAdmin as Mock;

type TableState = Record<string, { data: unknown; error: unknown }>;

function buildSupabaseMock(tables: TableState) {
  function makeQuery(table: string) {
    const result = tables[table] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      not: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => {
        const data = result.data;
        if (Array.isArray(data)) return { data: data[0] ?? null, error: result.error };
        return { data, error: result.error };
      }),
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return builder;
  }

  return { from: vi.fn((table: string) => makeQuery(table)) };
}

const ctx = (userId = 'u1') => ({ params: Promise.resolve({ userId }) });
const req = () =>
  new NextRequest('http://localhost/api/admin/teacher-funnel/u1/details') as unknown as import('next/server').NextRequest;

describe('GET details: plan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a trialing Polar teacher as Pro, using the shared entitlement answer', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(
      buildSupabaseMock({
        profiles: { data: { id: 'u1', user_role: 'teacher', last_seen_at: null, display_name: 'Ada', username: 'ada' }, error: null },
      }),
    );
    checkTeacherSubscription.mockResolvedValueOnce({
      tier: 'pro', status: 'trialing', has_pro: true, current_period_end: '2026-11-01T00:00:00Z',
    });
    const res = await GET(req(), ctx());
    const body = await res.json();
    expect(body.plan.hasPro).toBe(true);
  });
});
