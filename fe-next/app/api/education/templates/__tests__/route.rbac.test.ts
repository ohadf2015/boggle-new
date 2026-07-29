import { vi, type Mock, } from 'vitest';
/**
 * RBAC tests for /api/education/templates
 * Verifies teacher/admin role is required for write operations (POST/PATCH/DELETE).
 * TDD: tests written before implementation (RED → GREEN).
 */

// Mock next/server BEFORE any imports - following the pattern from practice/route.test.ts
vi.mock('next/server', () => {
  class MockNextRequest {
    private _body: Record<string, unknown> | null;
    url: string;
    method: string;

    constructor(url: string, init?: { method?: string; body?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this._body = init?.body ? JSON.parse(init.body) : null;
    }

    async json() {
      return this._body;
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { POST, PATCH, DELETE } from '../route';
import { createClient } from '@/utils/supabase/server';

interface MockSupabase {
  auth: { getUser: Mock };
  from: Mock;
}

let mockSupabase: MockSupabase;
let mockFrom: Mock;
let mockAuth: { getUser: Mock };

beforeEach(() => {
  vi.clearAllMocks();

  mockFrom = vi.fn();
  mockAuth = { getUser: vi.fn() };
  mockSupabase = { auth: mockAuth, from: mockFrom };


  createClient.mockResolvedValue(mockSupabase);
});

// ==================== Helpers ====================

/** Build a Supabase query chain resolving to given data/error */
type ChainData = Record<string, unknown> | null;
const chain = (data: ChainData, error: { message: string } | null = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
});

const makeReq = (method: string, body?: Record<string, unknown>, queryParams?: string): NextRequest => {
  const url = `http://localhost/api/education/templates${queryParams ? `?${queryParams}` : ''}`;
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
};

// ==================== POST Tests ====================

describe('POST /api/education/templates - teacher role required', () => {
  const validBody = {
    lessonId: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Template',
  };

  it('returns 401 for unauthenticated user', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Not auth') });

    const res = await POST(makeReq('POST', validBody));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 TEACHER_ROLE_REQUIRED for student role', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'student-id' } }, error: null });

    // call 1: profile RBAC check → student
    mockFrom.mockReturnValueOnce(chain({ user_role: 'student', is_admin: false }));

    const res = await POST(makeReq('POST', validBody));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('TEACHER_ROLE_REQUIRED');
  });

  it('returns 201 for teacher role with owned lesson', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-id' } }, error: null });

    // call 1: profile RBAC → teacher
    mockFrom.mockReturnValueOnce(chain({ user_role: 'teacher', is_admin: false }));
    // call 2: lesson ownership check
    mockFrom.mockReturnValueOnce(chain({ id: validBody.lessonId, teacher_id: 'teacher-id' }));
    // call 3: template insert
    mockFrom.mockReturnValueOnce(chain({ id: 'template-id', lesson_id: validBody.lessonId }));

    const res = await POST(makeReq('POST', validBody));

    expect(res.status).toBe(201);
  });

  it('returns 201 for admin role with owned lesson', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null });

    mockFrom.mockReturnValueOnce(chain({ user_role: 'admin', is_admin: true }));
    mockFrom.mockReturnValueOnce(chain({ id: validBody.lessonId, teacher_id: 'admin-id' }));
    mockFrom.mockReturnValueOnce(chain({ id: 'template-id', lesson_id: validBody.lessonId }));

    const res = await POST(makeReq('POST', validBody));

    expect(res.status).toBe(201);
  });
});

// ==================== PATCH Tests ====================

describe('PATCH /api/education/templates - teacher role required', () => {
  const validBody = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Updated Name',
  };

  it('returns 403 TEACHER_ROLE_REQUIRED for student role', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'student-id' } }, error: null });

    mockFrom.mockReturnValueOnce(chain({ user_role: 'student', is_admin: false }));

    const res = await PATCH(makeReq('PATCH', validBody));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('TEACHER_ROLE_REQUIRED');
  });

  it('returns 200 for teacher role with owned template', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-id' } }, error: null });

    mockFrom.mockReturnValueOnce(chain({ user_role: 'teacher', is_admin: false }));
    mockFrom.mockReturnValueOnce(chain({ id: validBody.id, lesson_id: 'l1', teacher_id: 'teacher-id' }));
    mockFrom.mockReturnValueOnce(chain({ id: validBody.id, name: validBody.name }));

    const res = await PATCH(makeReq('PATCH', validBody));

    expect(res.status).toBe(200);
  });
});

// ==================== DELETE Tests ====================

describe('DELETE /api/education/templates - teacher role required', () => {
  const templateId = '550e8400-e29b-41d4-a716-446655440010';

  it('returns 403 TEACHER_ROLE_REQUIRED for student role', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'student-id' } }, error: null });

    mockFrom.mockReturnValueOnce(chain({ user_role: 'student', is_admin: false }));

    const res = await DELETE(makeReq('DELETE', undefined, `id=${templateId}`));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('TEACHER_ROLE_REQUIRED');
  });

  it('returns 200 for teacher role with owned template', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-id' } }, error: null });

    // RBAC profile check
    mockFrom.mockReturnValueOnce(chain({ user_role: 'teacher', is_admin: false }));
    // Ownership check
    mockFrom.mockReturnValueOnce(chain({ id: templateId, teacher_id: 'teacher-id' }));
    // Delete call - .delete().eq() resolves without .single()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await DELETE(makeReq('DELETE', undefined, `id=${templateId}`));

    expect(res.status).toBe(200);
  });
});
