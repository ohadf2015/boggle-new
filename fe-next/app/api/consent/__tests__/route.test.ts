/**
 * Consent API Route Tests
 *
 * Tests for parental consent API endpoints.
 * Covers submit, retrieve, and revoke consent operations.
 */

// Mock next/server BEFORE any imports
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200 })),
  },
}));

// Mock logger - need to mock the default export properly
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Import handlers after mocks are set up
import {
  handleGetConsent,
  handleSubmitConsent,
  handleRevokeConsent,
} from '../route';

describe('Consent API Routes', () => {
  const mockUserId = 'user-123';
  const mockConsentData = {
    id: 'consent-123',
    user_id: 'user-123',
    parent_email: 'parent@example.com',
    child_birth_year: 2015,
    consent_given_at: '2024-01-01T00:00:00Z',
    consent_version: '1.0',
    revoked_at: null,
  };

  // Helper to create mock Supabase client
  const createMockSupabase = (
    selectData: unknown = null,
    selectError: { code?: string; message?: string } | null = null,
    insertData: unknown = null,
    insertError: { code?: string; message?: string } | null = null,
    updateError: { message?: string } | null = null
  ) => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: selectData,
            error: selectError,
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: insertData,
            error: insertError,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: updateError,
        }),
      }),
    }),
  });

  describe('handleGetConsent', () => {
    it('should return consent data when consent exists', async () => {
      const mockSupabase = createMockSupabase(mockConsentData, null);

      const result = await handleGetConsent(mockUserId, mockSupabase);

      expect(result.status).toBe(200);
      expect(result.data.consent).toEqual(mockConsentData);
      expect(result.data.hasConsent).toBe(true);
    });

    it('should return null consent when no consent exists', async () => {
      const mockSupabase = createMockSupabase(null, { code: 'PGRST116' });

      const result = await handleGetConsent(mockUserId, mockSupabase);

      expect(result.status).toBe(200);
      expect(result.data.consent).toBeNull();
      expect(result.data.hasConsent).toBe(false);
    });

    it('should return hasConsent=false when consent is revoked', async () => {
      const revokedConsent = { ...mockConsentData, revoked_at: '2024-06-01T00:00:00Z' };
      const mockSupabase = createMockSupabase(revokedConsent, null);

      const result = await handleGetConsent(mockUserId, mockSupabase);

      expect(result.status).toBe(200);
      expect(result.data.hasConsent).toBe(false);
    });

    it('should return 500 on database error', async () => {
      const mockSupabase = createMockSupabase(null, { code: 'INTERNAL', message: 'DB error' });

      const result = await handleGetConsent(mockUserId, mockSupabase);

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Failed to fetch consent status');
    });
  });

  describe('handleSubmitConsent', () => {
    it('should return 400 when parentEmail is missing', async () => {
      const mockSupabase = createMockSupabase();
      const body = { childBirthYear: 2015 };

      const result = await handleSubmitConsent(mockUserId, body, mockSupabase);

      expect(result.status).toBe(400);
      expect(result.data.error).toBe('Invalid request');
    });

    it('should return 400 when childBirthYear is missing', async () => {
      const mockSupabase = createMockSupabase();
      const body = { parentEmail: 'parent@example.com' };

      const result = await handleSubmitConsent(mockUserId, body, mockSupabase);

      expect(result.status).toBe(400);
      expect(result.data.error).toBe('Invalid request');
    });

    it('should return 400 when parentEmail is invalid', async () => {
      const mockSupabase = createMockSupabase();
      const body = { parentEmail: 'invalid-email', childBirthYear: 2015 };

      const result = await handleSubmitConsent(mockUserId, body, mockSupabase);

      expect(result.status).toBe(400);
      expect(result.data.error).toBe('Invalid request');
    });

    it('should create consent successfully', async () => {
      const mockSupabase = createMockSupabase(null, null, mockConsentData, null);
      const body = { parentEmail: 'parent@example.com', childBirthYear: 2015 };

      const result = await handleSubmitConsent(mockUserId, body, mockSupabase);

      expect(result.status).toBe(201);
      expect(result.data.consent).toEqual(mockConsentData);
    });

    it('should return 409 when consent already exists', async () => {
      const mockSupabase = createMockSupabase(null, null, null, { code: '23505' });
      const body = { parentEmail: 'parent@example.com', childBirthYear: 2015 };

      const result = await handleSubmitConsent(mockUserId, body, mockSupabase);

      expect(result.status).toBe(409);
      expect(result.data.error).toBe('Consent already exists');
    });

    it('should return 500 on database error', async () => {
      const mockSupabase = createMockSupabase(null, null, null, { code: 'INTERNAL', message: 'DB error' });
      const body = { parentEmail: 'parent@example.com', childBirthYear: 2015 };

      const result = await handleSubmitConsent(mockUserId, body, mockSupabase);

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Failed to submit consent');
    });
  });

  describe('handleRevokeConsent', () => {
    it('should revoke consent successfully', async () => {
      const mockSupabase = createMockSupabase(null, null, null, null, null);

      const result = await handleRevokeConsent(mockUserId, mockSupabase);

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      const mockSupabase = createMockSupabase(null, null, null, null, { message: 'DB error' });

      const result = await handleRevokeConsent(mockUserId, mockSupabase);

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Failed to revoke consent');
    });
  });
});
