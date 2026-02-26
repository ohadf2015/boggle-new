/**
 * RBAC tests for /api/education/templates
 * Verifies teacher/admin role is required for write operations (POST/PATCH/DELETE).
 * TDD: tests written before implementation (RED → GREEN).
 */

// Mock next/server BEFORE any imports - following the pattern from practice/route.test.ts
jest.mock('next/server', () => {
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
      json: jest.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

jest.mock('@/utils/supabase/server');
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { POST, PATCH, DELETE } from '../route';

interface MockSupabase {
  auth: { getUser: jest.Mock };
  from: jest.Mock;
}

let mockSupabase: MockSupabase;
let mockFrom: jest.Mock;
let mockAuth: { getUser: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();

  mockFrom = jest.fn();
  mockAuth = { getUser: jest.fn() };
  mockSupabase = { auth: mockAuth, from: mockFrom };

  const { createClient } = require('@/utils/supabase/server');
  createClient.mockResolvedValue(mockSupabase);
});

// ==================== Helpers ====================

/** Build a Supabase query chain resolving to given data/error */
type ChainData = Record<string, unknown> | null;
const chain = (data: ChainData, error: { message: string } | null = null) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error }),
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
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await DELETE(makeReq('DELETE', undefined, `id=${templateId}`));

    expect(res.status).toBe(200);
  });
});
