/**
 * Tests for POST /api/admin/users/:userId/set-teacher-role
 * TDD: RED phase - tests written before implementation
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// ==================== Mock Types ====================

interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

interface AdminRequest extends Request {
  requestId?: string;
  adminUser?: AdminUser;
}

// ==================== Mocks ====================

const { mockSupabaseFrom } = vi.hoisted(() => {
  const mockSupabaseFrom = vi.fn();
  return { mockSupabaseFrom };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

import playerRoutes from '../admin/playerRoutes';

// ==================== Test Helpers ====================

/** Build a mock Supabase query chain that resolves with given data/error. */
const buildMockChain = (data: unknown, error: Error | null = null) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve: (v: { data: unknown; error: Error | null }) => void) =>
      resolve({ data, error })
    ),
  };
  return chain;
};

const createTestApp = (override?: Partial<AdminUser>) => {
  const app = express();
  app.use(express.json());

  // Inject mock admin user (simulates adminAuth middleware passing)
  app.use((req: AdminRequest, _res: Response, next: NextFunction) => {
    req.adminUser = {
      id: 'admin-id-123',
      email: 'admin@test.com',
      username: 'testadmin',
      ...override,
    };
    req.requestId = 'req-test-id';
    next();
  });

  app.use('/', playerRoutes);

  return app;
};

// ==================== Tests ====================

describe('POST /api/admin/users/:userId/set-teacher-role', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  it('should set user_role to teacher when requester is admin', async () => {
    const targetUserId = 'user-to-promote-id';

    // Mock: user exists and is not already a teacher
    const lookupChain = buildMockChain({ id: targetUserId, user_role: 'student', is_admin: false });
    // Mock: update succeeds
    const updateChain = buildMockChain({ id: targetUserId, user_role: 'teacher' });

    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? lookupChain : updateChain;
    });

    const response = await request(app)
      .post(`/users/${targetUserId}/set-teacher-role`)
      .set('Authorization', 'Bearer fake-admin-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBe(targetUserId);
    expect(response.body.user_role).toBe('teacher');
  });

  it('should return 400 when userId param is missing or invalid', async () => {
    // Route with no userId param - testing param validation
    const response = await request(app)
      .post('/users//set-teacher-role');

    // Express will 404 for empty param segment
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should return 404 when target user does not exist', async () => {
    const targetUserId = 'nonexistent-user-id';

    // Mock: user not found
    const lookupChain = buildMockChain(null, new Error('Not found'));
    mockSupabaseFrom.mockReturnValue(lookupChain);

    const response = await request(app)
      .post(`/users/${targetUserId}/set-teacher-role`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
  });

  it('should return 409 when user is already a teacher', async () => {
    const targetUserId = 'already-teacher-id';

    // Mock: user exists and is already teacher
    const lookupChain = buildMockChain({ id: targetUserId, user_role: 'teacher', is_admin: false });
    mockSupabaseFrom.mockReturnValue(lookupChain);

    const response = await request(app)
      .post(`/users/${targetUserId}/set-teacher-role`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('ALREADY_TEACHER');
  });

  it('should return 500 when database update fails', async () => {
    const targetUserId = 'user-db-error-id';

    const lookupChain = buildMockChain({ id: targetUserId, user_role: 'student', is_admin: false });
    const updateChain = buildMockChain(null, new Error('DB error'));

    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? lookupChain : updateChain;
    });

    const response = await request(app)
      .post(`/users/${targetUserId}/set-teacher-role`);

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });

  it('should not demote admin users to teacher', async () => {
    const targetUserId = 'admin-user-id';

    // Mock: target user is admin
    const lookupChain = buildMockChain({ id: targetUserId, user_role: 'admin', is_admin: true });
    mockSupabaseFrom.mockReturnValue(lookupChain);

    const response = await request(app)
      .post(`/users/${targetUserId}/set-teacher-role`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('ALREADY_ADMIN');
  });
});
