import { vi, type Mock, } from 'vitest';
/**
 * Tests for Milog Words Admin API Route
 * Endpoint: GET /api/admin/milog-words
 */

// Mock Next.js server runtime BEFORE any imports
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
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

// Mock auth
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: vi.fn(),
}));

// Mock Supabase admin
vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

// Mock Sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

const mockVerifyAdminAuth = verifyAdminAuth as Mock;
const mockGetSupabaseAdmin = getSupabaseAdmin as Mock;

describe('GET /api/admin/milog-words', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      success: false,
      response: {
        json: () => Promise.resolve({ error: 'Unauthorized' }),
        status: 401,
      },
    });

    const request = new NextRequest('http://localhost/api/admin/milog-words') as unknown as Request;
    const response = await GET(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(401);
  });

  it('should return 500 when database not configured', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(null);

    const request = new NextRequest('http://localhost/api/admin/milog-words') as unknown as Request;
    const response = await GET(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database not configured');
  });

  it('should return milog words with stats', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });

    const mockWords = [
      {
        id: 'uuid-1',
        word: 'שלום',
        milog_status: 'verified',
        milog_verified_at: '2026-02-05T10:00:00Z',
        milog_url: 'https://milog.co.il/שלום',
        milog_attempts: 1,
        submission_count: 5,
        approved_at: '2026-02-05T12:00:00Z',
      },
      {
        id: 'uuid-2',
        word: 'בוקר',
        milog_status: 'verified',
        milog_verified_at: '2026-02-05T10:00:00Z',
        milog_url: 'https://milog.co.il/בוקר',
        milog_attempts: 1,
        submission_count: 3,
        approved_at: null,
      },
    ];

    const mockStatsData = [
      { milog_status: 'verified', approved_at: '2026-02-05T12:00:00Z' },
      { milog_status: 'verified', approved_at: null },
      { milog_status: 'not_found', approved_at: null },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValueOnce({
        data: mockWords,
        count: 2,
        error: null,
      }).mockResolvedValueOnce({
        data: mockStatsData,
        error: null,
      }),
    };

    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/admin/milog-words') as unknown as Request;
    const response = await GET(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.words).toHaveLength(2);
    expect(data.stats).toBeDefined();
  });

  it('should filter by status when provided', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    };

    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/admin/milog-words?status=promoted') as unknown as Request;
    const response = await GET(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(200);
    expect(mockSupabase.not).toHaveBeenCalledWith('approved_at', 'is', null);
  });

  it('should filter by search term when provided', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    };

    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/admin/milog-words?search=שלום') as unknown as Request;
    const response = await GET(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(200);
    expect(mockSupabase.ilike).toHaveBeenCalledWith('word', '%שלום%');
  });

  it('should handle database errors gracefully', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = new NextRequest('http://localhost/api/admin/milog-words') as unknown as Request;
    const response = await GET(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database error');
  });
});
