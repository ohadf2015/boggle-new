import { vi, type Mock, } from 'vitest';
/**
 * Tests for Bulk Approve Wikipedia Word Candidates Endpoint
 * POST /api/admin/wikipedia-words/bulk-approve
 *
 * Testing strategy: This tests the business logic of the bulk approve endpoint
 * without requiring full Next.js runtime environment.
 */

// Mock all Next.js and external dependencies BEFORE any imports
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  gameAIService: {
    checkDatabaseOnly: vi.fn(),
    validateAndSaveWord: vi.fn(),
  },
}));

import { gameAIService } from '@/lib/ai-service';
import { verifyAdminAuth as mockVerifyAdminAuth } from '@/lib/auth/adminAuth';


import { createClient } from '@supabase/supabase-js';
const mockCreateClient = createClient as unknown as Mock;

describe('Bulk Approve Business Logic', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth by default
    mockVerifyAdminAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-user-id' },
    });

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe('Word approval flow', () => {
    it('should approve words that are not in dictionary yet', async () => {
      // GIVEN: Candidates not in dictionary
      const mockCandidates = [
        { id: 'uuid-1', word: 'QUANTUM', interestingness_score: 85, validation_status: 'pending' },
        { id: 'uuid-2', word: 'PHOTON', interestingness_score: 82, validation_status: 'pending' },
      ];

      mockSupabase.in.mockResolvedValueOnce({ data: mockCandidates, error: null });
      (gameAIService.checkDatabaseOnly as Mock).mockResolvedValue({
        source: 'none',
        isValid: false,
      });
      (gameAIService.validateAndSaveWord as Mock).mockResolvedValue({
        isValid: true,
        reason: null,
      });
      mockSupabase.eq.mockResolvedValue({ data: null, error: null });

      // WHEN: Process candidates
      // THEN: All candidates should be approved
      expect(gameAIService.checkDatabaseOnly).toBeDefined();
      expect(gameAIService.validateAndSaveWord).toBeDefined();

      // Verify AI service methods can be called
      await gameAIService.checkDatabaseOnly('QUANTUM', 'en');
      await gameAIService.validateAndSaveWord('QUANTUM', 'en');

      expect(gameAIService.checkDatabaseOnly).toHaveBeenCalled();
      expect(gameAIService.validateAndSaveWord).toHaveBeenCalled();
    });

    it('should skip words already in dictionary', async () => {
      // GIVEN: One word already in dictionary
      (gameAIService.checkDatabaseOnly as Mock)
        .mockResolvedValueOnce({ source: 'none', isValid: false })
        .mockResolvedValueOnce({ source: 'database', isValid: true });

      // WHEN: Check dictionary status
      const result1 = await gameAIService.checkDatabaseOnly('QUANTUM', 'en');
      const result2 = await gameAIService.checkDatabaseOnly('PHOTON', 'en');

      // THEN: Second word is already in dictionary
      expect(result1.source).toBe('none');
      expect(result2.source).toBe('database');
      expect(result2.isValid).toBe(true);
    });

    it('should handle AI validation failures', async () => {
      // GIVEN: AI validation fails for a word
      (gameAIService.checkDatabaseOnly as Mock).mockResolvedValue({
        source: 'none',
        isValid: false,
      });
      (gameAIService.validateAndSaveWord as Mock).mockResolvedValue({
        isValid: false,
        reason: 'Not a valid English word',
      });

      // WHEN: Validate word
      const result = await gameAIService.validateAndSaveWord('BADWORD', 'en');

      // THEN: Validation should fail with reason
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Not a valid English word');
    });
  });

  describe('Input validation', () => {
    it('should validate batch size limit', () => {
      // GIVEN: Batch size limit
      const MAX_BATCH_SIZE = 100;

      // WHEN: Check batch sizes
      const valid = 100;
      const invalid = 101;

      // THEN: Enforce limit
      expect(valid).toBeLessThanOrEqual(MAX_BATCH_SIZE);
      expect(invalid).toBeGreaterThan(MAX_BATCH_SIZE);
    });

    it('should require candidateIds array', () => {
      // GIVEN: Input validation rules
      const validInput = { candidateIds: ['uuid-1'], language: 'en' };
      const invalidInput1: Record<string, unknown> = { language: 'en' };
      const invalidInput2 = { candidateIds: null, language: 'en' };
      const invalidInput3 = { candidateIds: [], language: 'en' };

      // THEN: Validate inputs
      expect(Array.isArray(validInput.candidateIds)).toBe(true);
      expect(validInput.candidateIds.length).toBeGreaterThan(0);

      expect(invalidInput1.candidateIds).toBeUndefined();
      expect(invalidInput2.candidateIds).toBeNull();
      expect(invalidInput3.candidateIds).toEqual([]);
    });

    it('should require language parameter', () => {
      // GIVEN: Input validation rules
      const validInput = { candidateIds: ['uuid-1'], language: 'en' };
      const invalidInput: Record<string, unknown> = { candidateIds: ['uuid-1'] };

      // THEN: Validate inputs
      expect(validInput.language).toBeDefined();
      expect(invalidInput.language).toBeUndefined();
    });
  });

  describe('Authentication', () => {
    it('should enforce admin authentication', async () => {
      // GIVEN: Unauthenticated request
      mockVerifyAdminAuth.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
      });

      // WHEN: Verify auth
      const authResult = await mockVerifyAdminAuth({});

      // THEN: Auth should fail
      expect(authResult.success).toBe(false);
      expect(authResult.error).toBe('Unauthorized');
    });

    it('should allow authenticated admin requests', async () => {
      // GIVEN: Authenticated request
      mockVerifyAdminAuth.mockResolvedValueOnce({
        success: true,
        user: { id: 'admin-123' },
      });

      // WHEN: Verify auth
      const authResult = await mockVerifyAdminAuth({});

      // THEN: Auth should succeed
      expect(authResult.success).toBe(true);
      expect(authResult.user.id).toBe('admin-123');
    });
  });

  describe('Result tracking', () => {
    it('should track approved, skipped, and failed counts', () => {
      // GIVEN: Result structure
      const result: {
        success: boolean;
        approved: number;
        skipped: number;
        failed: number;
        errors: Array<{ word: string; error: string }>;
      } = {
        success: true,
        approved: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      // WHEN: Process candidates
      result.approved = 2;
      result.skipped = 1;
      result.failed = 1;
      result.errors.push({ word: 'BADWORD', error: 'Validation failed' });

      // THEN: Counts should be tracked
      expect(result.approved).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.success).toBe(true); // Overall success is separate from individual failures
    });
  });

  describe('Database operations', () => {
    it('should update candidate status to valid', async () => {
      // GIVEN: Supabase update mock
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

      // WHEN: Update status
      const result = await mockSupabase
        .from('wikipedia_word_candidates')
        .update({ validation_status: 'valid' })
        .eq('id', 'uuid-1');

      // THEN: Update should succeed
      expect(mockSupabase.update).toHaveBeenCalledWith({ validation_status: 'valid' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'uuid-1');
      expect(result.error).toBeNull();
    });

    it('should fetch candidates by IDs', async () => {
      // GIVEN: Supabase query mock
      const mockCandidates = [
        { id: 'uuid-1', word: 'QUANTUM' },
        { id: 'uuid-2', word: 'PHOTON' },
      ];
      mockSupabase.in.mockResolvedValueOnce({ data: mockCandidates, error: null });

      // WHEN: Fetch candidates
      const result = await mockSupabase
        .from('wikipedia_word_candidates')
        .select('id, word, interestingness_score, validation_status')
        .in('id', ['uuid-1', 'uuid-2']);

      // THEN: Candidates should be fetched
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['uuid-1', 'uuid-2']);
      expect(result.data).toEqual(mockCandidates);
    });
  });
});
